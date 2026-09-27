// src/modules/chat/adapters/provider-adapter.interface.ts
export interface ChatCompletionResult {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ChatMessageInput {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
