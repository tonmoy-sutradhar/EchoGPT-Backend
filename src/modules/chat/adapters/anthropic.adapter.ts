// src/modules/chat/adapters/anthropic.adapter.ts
import { Injectable, BadGatewayException } from '@nestjs/common';
import {
  ChatCompletionResult,
  ChatMessageInput,
} from './provider-adapter.interface';

@Injectable()
export class AnthropicAdapter {
  async complete(
    apiBaseUrl: string,
    apiKey: string,
    messages: ChatMessageInput[],
  ): Promise<ChatCompletionResult> {
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${apiBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemMessage,
        messages: conversationMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new BadGatewayException(`Anthropic request failed: ${errorBody}`);
    }

    const data = await response.json();
    return {
      content: data.content?.[0]?.text ?? '',
      promptTokens: data.usage?.input_tokens,
      completionTokens: data.usage?.output_tokens,
      totalTokens:
        (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    };
  }

  async *stream(
    apiBaseUrl: string,
    apiKey: string,
    messages: ChatMessageInput[],
  ): AsyncGenerator<string> {
    const systemMessage = messages.find((m) => m.role === 'system')?.content;
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch(`${apiBaseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemMessage,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      throw new BadGatewayException(`Anthropic stream failed: ${errorBody}`);
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

        try {
          const json = JSON.parse(payload);
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield json.delta.text;
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
  }
}
