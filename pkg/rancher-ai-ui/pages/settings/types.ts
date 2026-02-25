/* eslint-disable no-unused-vars */

export interface SettingsPermissions {
  list: {
    canListSecrets: boolean;
    canListAiAgentCRDS: boolean;
  };
  create: {
    canCreateAiAgentCRDS: boolean;
    canCreateSecrets: boolean;
  };
}

export enum Settings {
  EMBEDDINGS_MODEL = 'EMBEDDINGS_MODEL',
  ENABLE_RAG = 'ENABLE_RAG',
  GOOGLE_API_KEY = 'GOOGLE_API_KEY',
  LANGFUSE_HOST = 'LANGFUSE_HOST',
  LANGFUSE_PUBLIC_KEY = 'LANGFUSE_PUBLIC_KEY',
  LANGFUSE_SECRET_KEY = 'LANGFUSE_SECRET_KEY',
  OLLAMA_MODEL = 'OLLAMA_MODEL',
  GEMINI_MODEL = 'GEMINI_MODEL',
  OPENAI_MODEL = 'OPENAI_MODEL',
  BEDROCK_MODEL = 'BEDROCK_MODEL',
  OLLAMA_URL = 'OLLAMA_URL',
  OPENAI_THIRD_PARTY_URL = 'OPENAI_URL',
  OPENAI_API_KEY = 'OPENAI_API_KEY',
  ACTIVE_CHATBOT = 'ACTIVE_LLM',
  AWS_REGION = 'AWS_REGION',
  AWS_BEARER_TOKEN_BEDROCK= 'AWS_BEARER_TOKEN_BEDROCK'
}

export interface SettingsFormData {
  [Settings.EMBEDDINGS_MODEL]?: string;
  [Settings.ENABLE_RAG]?: string;
  [Settings.GOOGLE_API_KEY]?: string;
  [Settings.LANGFUSE_HOST]?: string;
  [Settings.LANGFUSE_PUBLIC_KEY]?: string;
  [Settings.LANGFUSE_SECRET_KEY]?: string;
  [Settings.OLLAMA_MODEL]?: string;
  [Settings.GEMINI_MODEL]?: string;
  [Settings.OPENAI_MODEL]?: string;
  [Settings.BEDROCK_MODEL]?: string;
  [Settings.OLLAMA_URL]?: string;
  [Settings.OPENAI_THIRD_PARTY_URL]?: string;
  [Settings.OPENAI_API_KEY]?: string;
  [Settings.ACTIVE_CHATBOT]?: string;
  [Settings.AWS_REGION]?: string;
  [Settings.AWS_BEARER_TOKEN_BEDROCK]?: string;
}

export const enum ValidationStatus {
  IDLE = 'idle',
  VALIDATING = 'validating',
  SUCCESS = 'success',
  ERROR = 'error'
}

export interface Workload {
  nameDisplay: string;
  type: string;
  schema?: any;
  spec: {
    template: {
      metadata?: {
        annotations?: Record<string, string>;
      };
    };
  };
  save: () => Promise<void>;
}

export const enum AIAgentConfigAuthType {
  NONE = 'NONE',
  RANCHER = 'RANCHER',
  BASIC = 'BASIC'
}

export interface AiAgentConfigSecretPayload {
  selected: '_none' | '_basic' | string;
  privateKey: string;
  publicKey: string;
}

export const enum AIAgentConfigValidationType {
  CREATE = 'CREATE',
  DELETE = 'DELETE',
  UPDATE = 'UPDATE'
}
