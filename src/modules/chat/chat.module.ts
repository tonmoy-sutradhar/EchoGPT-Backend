// src/modules/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { OpenAiAdapter } from './adapters/openai.adapter';
import { AnthropicAdapter } from './adapters/anthropic.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, ChatMessage]),
    AiProvidersModule,
    SubscriptionsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, OpenAiAdapter, AnthropicAdapter, GeminiAdapter],
  exports: [ChatService],
})
export class ChatModule {}
