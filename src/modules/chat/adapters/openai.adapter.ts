// src/modules/chat/adapters/openai.adapter.ts
import { Injectable, BadGatewayException } from '@nestjs/common';
import {
  ChatCompletionResult,
  ChatMessageInput,
} from './provider-adapter.interface';

@Injectable()
export class OpenAiAdapter {
  async complete(
    apiBaseUrl: string,
    apiKey: string,
    messages: ChatMessageInput[],
  ): Promise<ChatCompletionResult> {
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadGatewayException(`OpenAI request failed: ${errorBody}`);
    }

    const data = await response.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens,
    };
  }

  async *stream(
    apiBaseUrl: string,
    apiKey: string,
    messages: ChatMessageInput[],
  ): AsyncGenerator<string> {
    const response = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, stream: true }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      throw new BadGatewayException(`OpenAI stream failed: ${errorBody}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.replace('data:', '').trim();
        if (payload === '[DONE]') return;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // ignore malformed chunk
        }
      }
    }
  }
}
