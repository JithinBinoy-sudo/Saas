import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from './interface';

const TIMEOUT_MS = 30_000;

export class AnthropicProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat({ system, user, model, temperature, maxTokens }: {
    system: string; user: string; model: string; temperature: number; maxTokens: number;
  }) {
    const client = new Anthropic({ apiKey: this.apiKey, timeout: TIMEOUT_MS });
    const res = await client.messages.create({
      model,
      temperature,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    });
    const block = res.content[0];
    if (!block || block.type !== 'text') throw new Error('Anthropic returned an empty response');
    return {
      text: block.text.trim(),
      promptTokens: res.usage.input_tokens,
      completionTokens: res.usage.output_tokens,
    };
  }
}
