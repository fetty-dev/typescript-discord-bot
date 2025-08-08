import { BotConfig } from '../types';

export const config: BotConfig = {
  token: process.env.TOKEN!,
  genesisChannelName: process.env.GENESIS_CHANNEL || '❍・genesis',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/discord-bot',
  ollamaApiUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  model: process.env.MODEL || 'gpt-oss:20b',
  enableThoughtThreads: process.env.ENABLE_THOUGHT_THREADS !== 'false' // Default to true
};

if (!config.token) {
  throw new Error('Discord token is required in environment variables');
}