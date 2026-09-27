// src/modules/chat/adapters/gemini.adapter.ts
import { Injectable, BadGatewayException } from '@nestjs/common';
import {
  ChatCompletionResult,
  ChatMessageInput,
} from './provider-adapter.interface';

@Injectable()
export class GeminiAdapter {
  async complete(
    apiBaseUrl: string,
    apiKey: string,
    messages: ChatMessageInput[],
  ): Promise<ChatCompletionResult> {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(
      `${apiBaseUrl}/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadGatewayException(`Gemini request failed: ${errorBody}`);
    }

    const data = await response.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
      totalTokens: data.usageMetadata?.totalTokenCount,
    };
  }

  // Gemini streaming needs a different endpoint; kept simple (non-streaming) for now.
  async *stream(
    apiBaseUrl: string,
    apiKey: string,
    messages: ChatMessageInput[],
  ): AsyncGenerator<string> {
    const result = await this.complete(apiBaseUrl, apiKey, messages);
    yield result.content;
  }
}
