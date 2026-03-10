export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  llm_provider: "openrouter" | "gemini" | "openai" | "anthropic";
  llm_api_key_encrypted: string | null;
  llm_model: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Thought {
  id: string;
  user_id: string;
  content: string;
  metadata: ThoughtMetadata;
  created_at: string;
}

export interface ThoughtMetadata {
  type?: string;
  topics?: string[];
  people?: string[];
  action_items?: string[];
  source?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  source: string;
  file_type: string;
  file_path: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  context_used: ContextUsed | null;
  created_at: string;
}

export interface ContextUsed {
  thoughtIds: string[];
  documentIds: string[];
  scores: number[];
}

export interface LLMConfig {
  provider: "openrouter" | "gemini" | "openai" | "anthropic";
  apiKey: string;
  model: string;
}

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
  source: "thought" | "document";
  title?: string;
  summary?: string;
}
