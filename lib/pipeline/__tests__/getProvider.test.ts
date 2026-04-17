import { inferProvider, getApiKeyForProvider } from '../getProvider';

describe('inferProvider', () => {
  it('maps gpt- models to openai', () => expect(inferProvider('gpt-4o')).toBe('openai'));
  it('maps gpt-4o-mini to openai', () => expect(inferProvider('gpt-4o-mini')).toBe('openai'));
  it('maps claude- models to anthropic', () => expect(inferProvider('claude-3-5-sonnet-20241022')).toBe('anthropic'));
  it('maps claude-3-haiku to anthropic', () => expect(inferProvider('claude-3-haiku-20240307')).toBe('anthropic'));
  it('maps gemini- models to google', () => expect(inferProvider('gemini-2.5-flash')).toBe('google'));
  it('maps gemini preview models to google', () => expect(inferProvider('gemini-3-flash-preview')).toBe('google'));
  it('throws on unknown model', () => expect(() => inferProvider('llama-3')).toThrow('Unsupported model'));
});

describe('getApiKeyForProvider', () => {
  const company = {
    openai_api_key: 'enc-openai',
    anthropic_api_key: 'enc-anthropic',
    google_api_key: null,
  };

  it('returns openai key', () => expect(getApiKeyForProvider('openai', company)).toBe('enc-openai'));
  it('returns anthropic key', () => expect(getApiKeyForProvider('anthropic', company)).toBe('enc-anthropic'));
  it('returns null when key is not configured', () => expect(getApiKeyForProvider('google', company)).toBeNull());
});
