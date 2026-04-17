export interface AIProvider {
  chat(params: {
    system: string;
    user: string;
    model: string;
    temperature: number;
    maxTokens: number;
  }): Promise<{
    text: string;
    promptTokens: number;
    completionTokens: number;
  }>;
}
