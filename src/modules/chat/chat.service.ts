// src/modules/chat/chat.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RenameConversationDto } from './dto/rename-conversation.dto';
import { AiProvidersService } from '../ai-providers/ai-providers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { ChatMessageInput } from './adapters/provider-adapter.interface';
import { MessageRole } from '../../common/enums/message-role.enum';
import { AiProviderName } from '../../common/enums/ai-provider-name.enum';
import { AiProvider } from '../ai-providers/entities/ai-provider.entity';

const CONTEXT_MESSAGE_LIMIT = 20;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationsRepository: Repository<Conversation>,
    @InjectRepository(ChatMessage)
    private readonly messagesRepository: Repository<ChatMessage>,
    private readonly providersService: AiProvidersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly openAiAdapter: OpenAiAdapter,
    private readonly anthropicAdapter: AnthropicAdapter,
    private readonly geminiAdapter: GeminiAdapter,
  ) {}

  // ---------- Conversations ----------

  async createConversation(userId: string, dto: CreateConversationDto) {
    const conversation = this.conversationsRepository.create({
      userId,
      title: dto.title ?? 'New conversation',
    });
    return this.conversationsRepository.save(conversation);
  }

  async listConversations(userId: string) {
    return this.conversationsRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.conversationsRepository.findOne({
      where: { id: conversationId, userId },
    });
    if (!conversation || conversation.deletedAt) {
      throw new NotFoundException('Conversation not found');
    }
    return conversation;
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    dto: RenameConversationDto,
  ) {
    const conversation = await this.getConversation(userId, conversationId);
    conversation.title = dto.title;
    return this.conversationsRepository.save(conversation);
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.getConversation(userId, conversationId);
    conversation.deletedAt = new Date();
    await this.conversationsRepository.save(conversation);
  }

  async getHistory(userId: string, conversationId: string) {
    await this.getConversation(userId, conversationId); // ownership check
    return this.messagesRepository.find({
      where: { conversationId, userId },
      order: { createdAt: 'ASC' },
    });
  }

  // ---------- Sending messages ----------

  async sendMessage(userId: string, dto: SendMessageDto) {
    await this.enforceUsageLimit(userId);

    const conversation = dto.conversationId
      ? await this.getConversation(userId, dto.conversationId)
      : await this.createConversation(userId, {});

    const provider = await this.resolveProvider(dto.providerId);

    // Save the user's message
    const userMessage = this.messagesRepository.create({
      conversationId: conversation.id,
      userId,
      role: MessageRole.USER,
      content: dto.prompt,
      providerId: provider.id,
    });
    await this.messagesRepository.save(userMessage);

    const history = await this.messagesRepository.find({
      where: { conversationId: conversation.id, userId },
      order: { createdAt: 'ASC' },
      take: CONTEXT_MESSAGE_LIMIT,
    });

    const contextMessages: ChatMessageInput[] = history
      .filter((m) => m.role !== MessageRole.TOOL)
      .map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

    const apiKey = await this.providersService.getDecryptedApiKey(provider.id);
    const startedAt = Date.now();

    let assistantMessage: ChatMessage;
    try {
      const result = await this.getAdapter(provider.name).complete(
        provider.apiBaseUrl,
        apiKey,
        contextMessages,
      );
      const latencyMs = Date.now() - startedAt;

      assistantMessage = this.messagesRepository.create({
        conversationId: conversation.id,
        userId,
        role: MessageRole.ASSISTANT,
        content: result.content,
        providerId: provider.id,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        latencyMs,
      });
      await this.messagesRepository.save(assistantMessage);

      conversation.providerId = provider.id;
      if (conversation.title === 'New conversation') {
        conversation.title = dto.prompt.slice(0, 60);
      }
      await this.conversationsRepository.save(conversation);

      await this.subscriptionsService.incrementChatUsage(userId);
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      assistantMessage = this.messagesRepository.create({
        conversationId: conversation.id,
        userId,
        role: MessageRole.ASSISTANT,
        content: '',
        providerId: provider.id,
        latencyMs,
        errorMessage: (error as Error).message,
      });
      await this.messagesRepository.save(assistantMessage);
      throw error;
    }

    return {
      conversationId: conversation.id,
      message: assistantMessage,
    };
  }

  async *sendMessageStream(userId: string, dto: SendMessageDto) {
    await this.enforceUsageLimit(userId);

    const conversation = dto.conversationId
      ? await this.getConversation(userId, dto.conversationId)
      : await this.createConversation(userId, {});

    const provider = await this.resolveProvider(dto.providerId);

    const userMessage = this.messagesRepository.create({
      conversationId: conversation.id,
      userId,
      role: MessageRole.USER,
      content: dto.prompt,
      providerId: provider.id,
    });
    await this.messagesRepository.save(userMessage);

    const history = await this.messagesRepository.find({
      where: { conversationId: conversation.id, userId },
      order: { createdAt: 'ASC' },
      take: CONTEXT_MESSAGE_LIMIT,
    });

    const contextMessages: ChatMessageInput[] = history
      .filter((m) => m.role !== MessageRole.TOOL)
      .map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      }));

    const apiKey = await this.providersService.getDecryptedApiKey(provider.id);
    const adapter = this.getAdapter(provider.name);

    let fullContent = '';
    const startedAt = Date.now();

    yield { event: 'start', conversationId: conversation.id };

    try {
      for await (const chunk of adapter.stream(
        provider.apiBaseUrl,
        apiKey,
        contextMessages,
      )) {
        fullContent += chunk;
        yield { event: 'chunk', data: chunk };
      }

      const latencyMs = Date.now() - startedAt;
      const assistantMessage = this.messagesRepository.create({
        conversationId: conversation.id,
        userId,
        role: MessageRole.ASSISTANT,
        content: fullContent,
        providerId: provider.id,
        latencyMs,
        isStreamed: true,
      });
      await this.messagesRepository.save(assistantMessage);

      conversation.providerId = provider.id;
      if (conversation.title === 'New conversation') {
        conversation.title = dto.prompt.slice(0, 60);
      }
      await this.conversationsRepository.save(conversation);

      await this.subscriptionsService.incrementChatUsage(userId);

      yield { event: 'done', messageId: assistantMessage.id };
    } catch (error) {
      yield { event: 'error', message: (error as Error).message };
    }
  }

  // ---------- Internal helpers ----------

  private async enforceUsageLimit(userId: string): Promise<void> {
    const usage = await this.subscriptionsService.getUsage(userId);
    if (usage.chat.remaining !== null && usage.chat.remaining <= 0) {
      throw new ForbiddenException(
        'You have reached your monthly chat request limit. Please upgrade your plan.',
      );
    }
  }

  private async resolveProvider(providerId?: string): Promise<AiProvider> {
    if (providerId) {
      const provider = await this.providersService.findById(providerId);
      if (!provider.isEnabled) {
        throw new BadRequestException(
          'Selected provider is currently disabled',
        );
      }
      return provider;
    }

    const defaultProvider = await this.providersService.getDefaultProvider();
    if (!defaultProvider) {
      throw new BadRequestException(
        'No default AI provider configured. Please contact an administrator.',
      );
    }
    return defaultProvider;
  }

  private getAdapter(name: AiProviderName) {
    switch (name) {
      case AiProviderName.OPENAI:
        return this.openAiAdapter;
      case AiProviderName.ANTHROPIC:
        return this.anthropicAdapter;
      case AiProviderName.GEMINI:
        return this.geminiAdapter;
      default:
        throw new BadRequestException('Unsupported provider');
    }
  }
}
