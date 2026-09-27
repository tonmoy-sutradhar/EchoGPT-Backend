// src/modules/web-search/web-search.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebSearch } from './entities/web-search.entity';
import { SearchResultsCache } from './entities/search-cache.entity';
import { SearchSuggestion } from './entities/search-suggestion.entity';
import { WebSearchService } from './web-search.service';
import { WebSearchController } from './web-search.controller';
import { SerpApiAdapter } from './adapters/serpapi.adapter';
import { AiProvidersModule } from '../ai-providers/ai-providers.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { OpenAiAdapter } from '../chat/adapters/openai.adapter';
import { AnthropicAdapter } from '../chat/adapters/anthropic.adapter';
import { GeminiAdapter } from '../chat/adapters/gemini.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebSearch, SearchResultsCache, SearchSuggestion]),
    AiProvidersModule,
    SubscriptionsModule,
  ],
  controllers: [WebSearchController],
  providers: [
    WebSearchService,
    SerpApiAdapter,
    OpenAiAdapter,
    AnthropicAdapter,
    GeminiAdapter,
  ],
  exports: [WebSearchService],
})
export class WebSearchModule {}
