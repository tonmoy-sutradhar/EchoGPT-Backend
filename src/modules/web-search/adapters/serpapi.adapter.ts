// src/modules/web-search/adapters/serpapi.adapter.ts
import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

@Injectable()
export class SerpApiAdapter {
  constructor(private readonly configService: ConfigService) {}

  async search(query: string): Promise<WebSearchResult[]> {
    const apiKey = this.configService.get<string>('app.serpApiKey');
    if (!apiKey) {
      throw new BadGatewayException(
        'Web search is not configured. Please set SERPAPI_KEY in the environment.',
      );
    }

    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
      query,
    )}&api_key=${apiKey}&num=10`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadGatewayException(
        `Search provider request failed: ${response.status}`,
      );
    }

    const data = await response.json();
    const organicResults = data.organic_results ?? [];

    return organicResults.slice(0, 10).map((item: any) => ({
      title: item.title ?? '',
      url: item.link ?? '',
      snippet: item.snippet ?? '',
    }));
  }
}
