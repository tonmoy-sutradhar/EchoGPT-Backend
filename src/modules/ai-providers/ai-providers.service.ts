// src/modules/ai-providers/ai-providers.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './entities/ai-provider.entity';
import { ProviderHealthCheck } from './entities/provider-health-check.entity';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { encryptSecret, decryptSecret } from '../../common/utils';
import { HealthStatus } from '../../common/enums/health-status.enum';
import { AiProviderName } from '../../common/enums/ai-provider-name.enum';

@Injectable()
export class AiProvidersService {
  private readonly logger = new Logger(AiProvidersService.name);

  constructor(
    @InjectRepository(AiProvider)
    private readonly providersRepository: Repository<AiProvider>,
    @InjectRepository(ProviderHealthCheck)
    private readonly healthChecksRepository: Repository<ProviderHealthCheck>,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateProviderDto, createdBy: string): Promise<AiProvider> {
    const encryptionKey =
      this.configService.getOrThrow<string>('app.encryptionKey');

    const provider = this.providersRepository.create({
      name: dto.name,
      displayName: dto.displayName,
      apiBaseUrl: dto.apiBaseUrl,
      apiKeyEncrypted: encryptSecret(dto.apiKey, encryptionKey),
      apiKeyLast4: dto.apiKey.slice(-4),
      config: dto.config ?? {},
      createdBy,
    });

    const saved = await this.providersRepository.save(provider);
    this.logger.log(`AI provider created: ${saved.id} (${saved.name})`);
    return saved;
  }

  async findAll(): Promise<AiProvider[]> {
    return this.providersRepository.find({
      where: { deletedAt: undefined },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<AiProvider> {
    const provider = await this.providersRepository.findOne({ where: { id } });
    if (!provider || provider.deletedAt) {
      throw new NotFoundException('AI provider not found');
    }
    return provider;
  }

  async update(id: string, dto: UpdateProviderDto): Promise<AiProvider> {
    const provider = await this.findById(id);

    if (dto.displayName !== undefined) provider.displayName = dto.displayName;
    if (dto.apiBaseUrl !== undefined) provider.apiBaseUrl = dto.apiBaseUrl;
    if (dto.config !== undefined) provider.config = dto.config;
    if (dto.isEnabled !== undefined) provider.isEnabled = dto.isEnabled;

    if (dto.apiKey) {
      const encryptionKey =
        this.configService.getOrThrow<string>('app.encryptionKey');
      provider.apiKeyEncrypted = encryptSecret(dto.apiKey, encryptionKey);
      provider.apiKeyLast4 = dto.apiKey.slice(-4);
    }

    return this.providersRepository.save(provider);
  }

  async delete(id: string): Promise<void> {
    const provider = await this.findById(id);
    provider.deletedAt = new Date();
    provider.isDefault = false;
    await this.providersRepository.save(provider);
    this.logger.log(`AI provider soft-deleted: ${id}`);
  }

  async setEnabled(id: string, isEnabled: boolean): Promise<AiProvider> {
    const provider = await this.findById(id);
    provider.isEnabled = isEnabled;
    return this.providersRepository.save(provider);
  }

  async setDefault(id: string): Promise<AiProvider> {
    const provider = await this.findById(id);
    if (!provider.isEnabled) {
      throw new BadRequestException(
        'Cannot set a disabled provider as default',
      );
    }

    // Unset any existing default first (partial unique index enforces only one)
    await this.providersRepository
      .createQueryBuilder()
      .update(AiProvider)
      .set({ isDefault: false })
      .where('is_default = TRUE')
      .execute();

    provider.isDefault = true;
    return this.providersRepository.save(provider);
  }

  async getDefaultProvider(): Promise<AiProvider | null> {
    return this.providersRepository.findOne({
      where: { isDefault: true, isEnabled: true },
    });
  }

  async checkHealth(id: string): Promise<ProviderHealthCheck> {
    const provider = await this.findById(id);
    const encryptionKey =
      this.configService.getOrThrow<string>('app.encryptionKey');
    const apiKey = decryptSecret(provider.apiKeyEncrypted, encryptionKey);

    const startedAt = Date.now();
    let status: HealthStatus = HealthStatus.UNKNOWN;
    let errorMessage: string | null = null;

    try {
      await this.pingProvider(provider.name, provider.apiBaseUrl, apiKey);
      status = HealthStatus.HEALTHY;
    } catch (error) {
      status = HealthStatus.UNHEALTHY;
      errorMessage = (error as Error).message;
    }

    const latencyMs = Date.now() - startedAt;

    const check = this.healthChecksRepository.create({
      providerId: provider.id,
      status,
      latencyMs,
      errorMessage,
    });
    await this.healthChecksRepository.save(check);

    provider.healthStatus = status;
    provider.lastHealthCheckAt = new Date();
    await this.providersRepository.save(provider);

    return check;
  }

  async checkAllHealth(): Promise<ProviderHealthCheck[]> {
    const providers = await this.providersRepository.find({
      where: { isEnabled: true, deletedAt: undefined },
    });
    const results: ProviderHealthCheck[] = [];
    for (const provider of providers) {
      try {
        const result = await this.checkHealth(provider.id);
        results.push(result);
      } catch (error) {
        this.logger.error(
          `Health check failed for ${provider.id}: ${(error as Error).message}`,
        );
      }
    }
    return results;
  }

  private async pingProvider(
    name: AiProviderName,
    baseUrl: string,
    apiKey: string,
  ): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      let url: string;
      let headers: Record<string, string>;

      switch (name) {
        case AiProviderName.OPENAI:
          url = `${baseUrl}/models`;
          headers = { Authorization: `Bearer ${apiKey}` };
          break;
        case AiProviderName.ANTHROPIC:
          url = `${baseUrl}/models`;
          headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
          break;
        case AiProviderName.GEMINI:
          url = `${baseUrl}/models?key=${apiKey}`;
          headers = {};
          break;
        default:
          throw new Error('Unsupported provider');
      }

      const response = await fetch(url, { headers, signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Provider responded with status ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  // Used internally by Chat module to get a usable API key
  async getDecryptedApiKey(providerId: string): Promise<string> {
    const provider = await this.findById(providerId);
    const encryptionKey =
      this.configService.getOrThrow<string>('app.encryptionKey');
    return decryptSecret(provider.apiKeyEncrypted, encryptionKey);
  }

  toResponse(provider: AiProvider) {
    return {
      id: provider.id,
      name: provider.name,
      displayName: provider.displayName,
      apiBaseUrl: provider.apiBaseUrl,
      maskedApiKey: `****${provider.apiKeyLast4 ?? '????'}`,
      isEnabled: provider.isEnabled,
      isDefault: provider.isDefault,
      healthStatus: provider.healthStatus,
      lastHealthCheckAt: provider.lastHealthCheckAt ?? null,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    };
  }
}
