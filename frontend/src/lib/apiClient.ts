import type {
  CreateWasteRecordRequest,
  CreateWasteRecordResponse,
  GetWasteRecordsResponse,
  CreateAnalysisRequest,
  CreateAnalysisResponse,
  GetAnalysisResponse,
  CompareScenariosRequest,
  CompareScenariosResponse,
  GenerateInsightsRequest,
  GenerateInsightsResponse,
  ApiErrorResponse,
} from '../domain/contracts/apiContracts';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://127.0.0.1:3001';

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details?: string[];
  readonly requestId?: string;

  constructor(errorResponse: ApiErrorResponse) {
    super(errorResponse.message);
    this.name = 'ApiError';
    this.statusCode = errorResponse.statusCode;
    this.errorCode = errorResponse.errorCode;
    this.details = errorResponse.details;
    this.requestId = errorResponse.requestId;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorBody: ApiErrorResponse;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = {
        statusCode: res.status,
        errorCode: 'HTTP_ERROR',
        message: `HTTP error ${res.status}: ${res.statusText}`,
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiError(errorBody);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  async checkHealth(): Promise<{ status: string; uptimeSeconds: number; timestamp: string }> {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },

  async getWasteRecords(params: {
    siteId: string;
    limit?: number;
    offset?: number;
    category?: string;
    source?: string;
    provenance?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<GetWasteRecordsResponse> {
    const query = new URLSearchParams();
    query.set('siteId', params.siteId);
    if (params.limit !== undefined) query.set('limit', params.limit.toString());
    if (params.offset !== undefined) query.set('offset', params.offset.toString());
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.source && params.source !== 'all') query.set('source', params.source);
    if (params.provenance && params.provenance !== 'all') query.set('provenance', params.provenance);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const res = await fetch(`${API_BASE_URL}/waste-records?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<GetWasteRecordsResponse>(res);
  },

  async createWasteRecord(payload: CreateWasteRecordRequest): Promise<CreateWasteRecordResponse> {
    const res = await fetch(`${API_BASE_URL}/waste-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CreateWasteRecordResponse>(res);
  },

  async createAnalysis(payload: CreateAnalysisRequest): Promise<CreateAnalysisResponse> {
    const res = await fetch(`${API_BASE_URL}/analyses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CreateAnalysisResponse>(res);
  },

  async getAnalysisById(id: string): Promise<GetAnalysisResponse> {
    const res = await fetch(`${API_BASE_URL}/analyses/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse<GetAnalysisResponse>(res);
  },

  async compareScenarios(payload: CompareScenariosRequest): Promise<CompareScenariosResponse> {
    const res = await fetch(`${API_BASE_URL}/scenarios/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CompareScenariosResponse>(res);
  },

  async generateInsights(payload: GenerateInsightsRequest): Promise<GenerateInsightsResponse> {
    const res = await fetch(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<GenerateInsightsResponse>(res);
  },

  async getInsightsConfig(): Promise<{
    provider: string;
    model: string;
    hasApiKey: boolean;
    timeoutMs: number;
    fallbackAvailable: boolean;
  }> {
    const res = await fetch(`${API_BASE_URL}/insights/config`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return handleResponse(res);
  },
};
