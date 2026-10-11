export interface AiConfig {
  provider: 'deterministic' | 'external';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

export function getAiConfig(): AiConfig {
  const providerEnv = (process.env.AI_PROVIDER || 'deterministic').toLowerCase();
  const provider = providerEnv === 'external' ? 'external' : 'deterministic';
  const model = process.env.AI_MODEL || (provider === 'external' ? 'claude-3-5-sonnet-latest' : 'deterministic-engine-v1');
  const apiKey = process.env.AI_API_KEY || undefined;
  const baseUrl = process.env.AI_BASE_URL || undefined;

  let timeoutMs = parseInt(process.env.AI_TIMEOUT_MS || '10000', 10);
  if (isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 60000) {
    timeoutMs = 10000;
  }

  let maxOutputTokens = parseInt(process.env.AI_MAX_OUTPUT_TOKENS || '2048', 10);
  if (isNaN(maxOutputTokens) || maxOutputTokens < 256 || maxOutputTokens > 8192) {
    maxOutputTokens = 2048;
  }

  return {
    provider,
    model,
    apiKey,
    baseUrl,
    timeoutMs,
    maxOutputTokens,
  };
}
