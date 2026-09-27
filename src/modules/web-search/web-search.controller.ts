// src/modules/web-search/web-search.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import { WebSearchService } from './web-search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchSuggestionsQueryDto } from './dto/search-suggestions-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUser } from '../../common/decorators';
import type { AuthenticatedUser } from '../../common/interfaces';

@ApiTags('Web Search')
@ApiBearerAuth('access-token')
@Controller({ path: 'search', version: '1' })
export class WebSearchController {
  constructor(private readonly webSearchService: WebSearchService) {}

  @Post()
  @ApiOperation({ summary: 'Perform an AI-assisted web search' })
  @ApiOkResponse({ description: 'Search completed successfully' })
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SearchQueryDto,
  ) {
    const result = await this.webSearchService.search(
      user.id,
      dto.query,
      dto.providerId,
    );
    return { message: 'Search completed successfully', data: result };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated search history' })
  @ApiOkResponse({ description: 'Search history fetched successfully' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    const result = await this.webSearchService.getHistory(
      user.id,
      query.page,
      query.limit,
    );
    return { message: 'Search history fetched successfully', data: result };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent searches (last 10 by default)' })
  @ApiOkResponse({ description: 'Recent searches fetched successfully' })
  async getRecent(@CurrentUser() user: AuthenticatedUser) {
    const results = await this.webSearchService.getRecentSearches(user.id);
    return { message: 'Recent searches fetched successfully', data: results };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions (autocomplete)' })
  @ApiOkResponse({ description: 'Suggestions fetched successfully' })
  async getSuggestions(@Query() query: SearchSuggestionsQueryDto) {
    const suggestions = await this.webSearchService.getSuggestions(query.q);
    return { message: 'Suggestions fetched successfully', data: suggestions };
  }

  @Delete('history/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a single search history item' })
  @ApiOkResponse({ description: 'Search history item deleted' })
  async deleteHistoryItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.webSearchService.deleteSearchHistoryItem(user.id, id);
    return { message: 'Search history item deleted', data: null };
  }

  @Delete('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear all search history for the current user' })
  @ApiOkResponse({ description: 'Search history cleared' })
  async clearHistory(@CurrentUser() user: AuthenticatedUser) {
    await this.webSearchService.clearHistory(user.id);
    return { message: 'Search history cleared', data: null };
  }
}
