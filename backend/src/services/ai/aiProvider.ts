import type { GroundedAiContext } from './aiContext';
import {
  InsightResponseSchema,
  type InsightResponse,
} from '../../../../frontend/src/domain/schemas/insight.schema';
import { buildGroundedPrompts } from './promptBuilder';
import type { AiConfig } from './aiConfig';

export class AiProviderError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, code = 'AI_PROVIDER_ERROR', status = 502) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.status = status;
  }
}

export interface IAiProvider {
  readonly providerName: 'deterministic' | 'external';
  readonly modelIdentifier: string;
  generateInsights(context: GroundedAiContext): Promise<InsightResponse>;
}

export class ExternalHttpAiProvider implements IAiProvider {
  readonly providerName = 'external' as const;
  readonly modelIdentifier: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: AiConfig) {
    if (!config.apiKey) {
      throw new AiProviderError('External AI provider requires AI_API_KEY environment variable.', 'MISSING_API_KEY', 500);
    }
    this.modelIdentifier = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1/chat/completions';
    this.timeoutMs = config.timeoutMs;
  }

  async generateInsights(context: GroundedAiContext): Promise<InsightResponse> {
    const { systemPrompt, userPrompt } = buildGroundedPrompts(context);

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    let rawResponse: Response;
    try {
      rawResponse = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelIdentifier,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1, // low temperature for grounded deterministic adherence
        }),
        signal: controller.signal,
      });
    } catch (networkError: unknown) {
      clearTimeout(timeoutHandle);
      const isTimeout = networkError instanceof Error && networkError.name === 'AbortError';
      throw new AiProviderError(
        isTimeout ? `External AI provider request timed out after ${this.timeoutMs}ms.` : `External AI provider connection failed: ${(networkError as Error).message}`,
        isTimeout ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR',
        isTimeout ? 504 : 502
      );
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (!rawResponse.ok) {
      let errText = '';
      try {
        errText = await rawResponse.text();
      } catch {
        errText = rawResponse.statusText;
      }
      throw new AiProviderError(
        `External AI provider returned HTTP ${rawResponse.status}: ${errText.slice(0, 300)}`,
        rawResponse.status === 429 ? 'AI_RATE_LIMITED' : 'AI_UPSTREAM_ERROR',
        rawResponse.status === 429 ? 429 : 502
      );
    }

    let parsedBody: any;
    try {
      parsedBody = await rawResponse.json();
    } catch {
      throw new AiProviderError('External AI provider returned invalid non-JSON HTTP response.', 'AI_MALFORMED_OUTPUT', 502);
    }

    // Extract message content from standard chat completions shape
    const contentString = parsedBody.choices?.[0]?.message?.content || parsedBody.content || parsedBody;

    let payloadJson: any;
    if (typeof contentString === 'string') {
      try {
        // Strip markdown code fences if model returned ```json ... ```
        const cleanJson = contentString.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        payloadJson = JSON.parse(cleanJson);
      } catch {
        throw new AiProviderError('External AI provider response could not be parsed as valid JSON.', 'AI_INVALID_JSON', 502);
      }
    } else {
      payloadJson = contentString;
    }

    // Ensure metadata tags match provider
    payloadJson.provider = 'external';
    payloadJson.modelIdentifier = this.modelIdentifier;
    payloadJson.generatedAt = new Date().toISOString();
    payloadJson.humanReviewRequired = true;

    // Strict Zod schema validation
    const validationResult = InsightResponseSchema.safeParse(payloadJson);
    if (!validationResult.success) {
      const issueDetails = validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new AiProviderError(
        `External AI provider output failed strict schema validation: ${issueDetails}`,
        'AI_SCHEMA_VALIDATION_ERROR',
        502
      );
    }

    return validationResult.data;
  }
}
