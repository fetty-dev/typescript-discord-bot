export interface BotConfig {
  token: string;
  genesisChannelName: string;
  mongoUri: string;
  ollamaApiUrl: string;
  model: string;
  enableThoughtThreads: boolean;
}

export interface UserMemory {
  userId: string;
  guildId: string;
  chatHistory: ChatMessage[];
  preferences: Record<string, any>;
  threadId?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ClassificationResult {
  type: 'general' | 'web_search' | 'code_analysis' | 'data_analysis';
  confidence: number;
  reasoning?: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}