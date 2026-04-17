import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './interface';

export class GoogleProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async chat({ system, user, model, temperature, maxTokens }: {
    system: string; user: string; model: string; temperature: number; maxTokens: number;
  }) {
    const genAI = new GoogleGenerativeAI(this.apiKey);
    const genModel = genAI.getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    });
    const result = await genModel.generateContent(user);
    const text = result.response.text();
    if (!text) throw new Error('Gemini returned an empty response');
    const usage = result.response.usageMetadata;
    return {
      text: text.trim(),
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
    };
  }
}
