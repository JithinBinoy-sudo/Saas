import OpenAI from 'openai';
import type { AIProvider } from './interface';

const TIMEOUT_MS = 30_000;

export class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat({ system, user, model, temperature, maxTokens }: {
    system: string; user: string; model: string; temperature: number; maxTokens: number;
  }) {
    const client = new OpenAI({ apiKey: this.apiKey, timeout: TIMEOUT_MS });
    const res = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned an empty response');
    return {
      text: text.trim(),
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
    };
  }
}
