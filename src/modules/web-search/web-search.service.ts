// src/modules/web-search/web-search.service.ts
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { WebSearch } from './entities/web-search.entity';
import { SearchResultsCache } from './entities/search-cache.entity';
import { SearchSuggestion } from './entities/search-suggestion.entity';
import { SerpApiAdapter, WebSearchResult } from './adapters/serpapi.adapter';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { OpenAiAdapter } from '../chat/adapters/openai.adapter';
import { AnthropicAdapter } from '../chat/adapters/anthropic.adapter';
import { GeminiAdapter } from '../chat/adapters/gemini.adapter';
import { AiProviderName } from '../../common/enums/ai-provider-name.enum';

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  constructor(
    @InjectRepository(WebSearch)
    private readonly webSearchesRepository: Repository<WebSearch>,
    @InjectRepository(SearchResultsCache)
    private readonly cacheRepository: Repository<SearchResultsCache>,
    @InjectRepository(SearchSuggestion)
    private readonly suggestionsRepository: Repository<SearchSuggestion>,
    private readonly serpApiAdapter: SerpApiAdapter,
    private readonly providersService: AiProvidersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
    private readonly openAiAdapter: OpenAiAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly geminiAdapter: GeminiAdapter,
  ) {}

  async search(userId: string, query: string, providerId?: string) {
    await this.enforceUsageLimit(userId);

    const normalizedQuery = this.normalize(query);
    const cacheKey = this.getCacheKey(normalizedQuery);
    const startedAt = Date.now();

    let results: WebSearchResult[];
    const cached = await this.cacheRepository.findOne({
      where: { cacheKey, expiresAt: MoreThan(new Date()) },
    });

    if (cached) {
      results = cached.results;
      cached.hitCount += 1;
      await this.cacheRepository.save(cached);
      this.logger.debug(`Cache hit for query: ${normalizedQuery}`);
    } else {
      results = await this.serpApiAdapter.search(query);
      await this.saveToCache(cacheKey, query, results);
    }

    const provider = providerId
      ? await this.providersService.findById(providerId)
      : await this.providersService.getDefaultProvider();

    let summary: string | null = null;
    if (provider && results.length > 0) {
      try {
        summary = await this.summarizeResults(
          query,
          results,
          provider.name,
          provider,
        );
      } catch (error) {
        this.logger.warn(
          `Summary generation failed: ${(error as Error).message}`,
        );
      }
    }

    const latencyMs = Date.now() - startedAt;

    const record = this.webSearchesRepository.create({
      userId,
      query,
      normalizedQuery,
      providerId: provider?.id,
      summary,
      resultCount: results.length,
      results,
      latencyMs,
    });
    await this.webSearchesRepository.save(record);

    await this.updateSuggestion(normalizedQuery, query);
    await this.subscriptionsService.incrementSearchUsage(userId);

    return record;
  }

  async getHistory(userId: string, page = 1, limit = 20) {
    const [items, total] = await this.webSearchesRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRecentSearches(userId: string, limit = 10) {
    return this.webSearchesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['id', 'query', 'resultCount', 'createdAt'],
    });
  }

  async getSuggestions(partial?: string) {
    const qb = this.suggestionsRepository
      .createQueryBuilder('s')
      .orderBy('s.popularity_score', 'DESC')
      .addOrderBy('s.last_searched_at', 'DESC')
      .limit(10);

    if (partial && partial.trim().length > 0) {
      qb.where('s.normalized_text ILIKE :partial', {
        partial: `%${this.normalize(partial)}%`,
      });
    }

    return qb.getMany();
  }

  async deleteSearchHistoryItem(userId: string, id: string): Promise<void> {
    await this.webSearchesRepository.delete({ id, userId });
  }

  async clearHistory(userId: string): Promise<void> {
    await this.webSearchesRepository.delete({ userId });
  }

  // ---------- Internal helpers ----------

  private async enforceUsageLimit(userId: string): Promise<void> {
    const usage = await this.subscriptionsService.getUsage(userId);
    if (usage.search.remaining !== null && usage.search.remaining <= 0) {
      throw new ForbiddenException(
        'You have reached your monthly search request limit. Please upgrade your plan.',
      );
    }
  }

  private normalize(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private getCacheKey(normalizedQuery: string): string {
    return createHash('sha256')
      .update(normalizedQuery)
      .digest('hex')
      .slice(0, 64);
  }

  private async saveToCache(
    cacheKey: string,
    query: string,
    results: WebSearchResult[],
  ): Promise<void> {
    const ttlHours =
      this.configService.get<number>('app.searchCacheTtlHours') ?? 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    const existing = await this.cacheRepository.findOne({
      where: { cacheKey },
    });
    if (existing) {
      existing.results = results;
      existing.expiresAt = expiresAt;
      await this.cacheRepository.save(existing);
    } else {
      const entry = this.cacheRepository.create({
        cacheKey,
        query,
        results,
        expiresAt,
      });
      await this.cacheRepository.save(entry);
    }
  }

  private async updateSuggestion(
    normalizedQuery: string,
    original: string,
  ): Promise<void> {
    const existing = await this.suggestionsRepository.findOne({
      where: { normalizedText: normalizedQuery },
    });

    if (existing) {
      existing.popularityScore += 1;
      existing.lastSearchedAt = new Date();
      await this.suggestionsRepository.save(existing);
    } else {
      const suggestion = this.suggestionsRepository.create({
        suggestion: original,
        normalizedText: normalizedQuery,
        lastSearchedAt: new Date(),
      });
      await this.suggestionsRepository.save(suggestion);
    }
  }

  private async summarizeResults(
    query: string,
    results: WebSearchResult[],
    providerName: AiProviderName,
    provider: { id: string; apiBaseUrl: string },
  ): Promise<string> {
    const apiKey = await this.providersService.getDecryptedApiKey(provider.id);
    const context = results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\nURL: ${r.url}`)
      .join('\n\n');

    const messages = [
      {
        role: 'system' as const,
        content:
          'You are a helpful assistant that summarizes web search results concisely in 2-4 sentences.',
      },
      {
        role: 'user' as const,
        content: `Search query: "${query}"\n\nResults:\n${context}\n\nProvide a brief summary of the key findings.`,
      },
    ];

    let adapter;
    switch (providerName) {
      case AiProviderName.OPENAI:
        adapter = this.openAiAdapter;
        break;
      case AiProviderName.ANTHROPIC:
        adapter = this.anthropicAdapter;
        break;
      case AiProviderName.GEMINI:
        adapter = this.geminiAdapter;
        break;
      default:
        return '';
    }

    const result = await adapter.complete(
      provider.apiBaseUrl,
      apiKey,
      messages,
    );
    return result.content;
  }
}
