// API Service for communicating with the backend
import type { SchemaDefinition, SQLDialect, GenerateSchemaResponse } from '../engine/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiError {
  detail: string;
}

export interface SavedSchema {
  id: string;
  prompt: string;
  dialect: SQLDialect;
  schema_data: SchemaDefinition;
  created_at: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const userEmail = localStorage.getItem('userEmail');
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...(userEmail ? { 'X-User-Email': userEmail } : {}),
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        detail: `HTTP error ${response.status}`,
      }));
      throw new Error(error.detail);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; version: string; ai_provider: string; pipeline: string }> {
    return this.request('/api/health');
  }

  async generateSchema(
    prompt: string,
    dialect: SQLDialect,
    additionalContext?: string,
    complexityLevel?: 'simple' | 'standard' | 'enterprise',
  ): Promise<SchemaDefinition> {
    const response = await this.request<GenerateSchemaResponse>('/api/generate-schema', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        dialect,
        additionalContext,
        complexityLevel: complexityLevel || 'standard',
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate schema');
    }

    // Log warnings if any
    if (response.warnings?.length) {
      console.log('Schema generation warnings:', response.warnings);
    }

    return response.schema as SchemaDefinition;
  }

  async refineSchema(
    schema: SchemaDefinition,
    refinementPrompt: string
  ): Promise<SchemaDefinition> {
    const response = await this.request<GenerateSchemaResponse>('/api/refine-schema', {
      method: 'POST',
      body: JSON.stringify({
        schema,
        refinementPrompt,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to refine schema');
    }

    if (response.warnings?.length) {
      console.log('Schema refinement warnings:', response.warnings);
    }

    return response.schema as SchemaDefinition;
  }

  async getSchemas(): Promise<SavedSchema[]> {
    return this.request<SavedSchema[]>('/api/schemas');
  }

  async getSchema(schemaId: string): Promise<SavedSchema> {
    return this.request<SavedSchema>(`/api/schemas/${schemaId}`);
  }
}

// Export singleton instance
export const api = new ApiService();
export default api;
