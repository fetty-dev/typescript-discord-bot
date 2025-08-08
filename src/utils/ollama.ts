import axios from 'axios';
import { config } from '../config';
import { OllamaResponse, ChatMessage, ClassificationResult } from '../types';

export class OllamaClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.ollamaApiUrl;
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    console.log(`🌐 OllamaClient: Making API call to ${this.baseUrl}/api/chat`);
    console.log(`🤖 Using model: ${config.model}`);
    console.log(`📝 Messages count: ${messages.length}, System prompt: ${!!systemPrompt}`);
    
    try {
      const payload = {
        model: config.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ],
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          num_predict: 256,   // More aggressive limit for speed
          num_ctx: 1024,      // Reduced context for experimental GPU
          num_batch: 256,     // Smaller batch for stability
          num_gpu_layers: -1, // Use all GPU layers
          low_vram: false,    // RX 9070XT has 16GB, use it all
          f16_kv: true,       // Half precision
          use_mlock: true,    // Keep in memory
          use_mmap: true,     // Memory mapping
          num_thread: 8,      // Match your CPU cores for fallback
          rope_freq_base: 10000,
          rope_freq_scale: 1.0
        }
      };
      
      console.log('📤 Sending request to Ollama...');
      const response = await axios.post(`${this.baseUrl}/api/chat`, payload, {
        timeout: 30000, // Reduced timeout for GPU (should be much faster)
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Received response from Ollama');
      const data: OllamaResponse = response.data;
      
      if (!data.message || !data.message.content) {
        console.error('⚠️ Invalid response structure from Ollama:', data);
        throw new Error('Invalid response from Ollama API');
      }
      
      console.log(`✅ Successfully got response (${data.message.content.length} chars)`);
      return data.message.content;
    } catch (error: any) {
      console.error('💥 Ollama API error:', error);
      
      if (error.code === 'ECONNREFUSED') {
        console.error('🔥 Connection refused - is Ollama server running on ' + this.baseUrl + '?');
        throw new Error('Cannot connect to Ollama server. Is it running?');
      } else if (error.response) {
        console.error('🔥 HTTP Error:', error.response.status, error.response.data);
        throw new Error(`Ollama API returned ${error.response.status}: ${error.response.data?.error || 'Unknown error'}`);
      } else if (error.code === 'ETIMEDOUT') {
        console.error('⏱️ Request timed out');
        throw new Error('Ollama API request timed out');
      } else {
        console.error('🔥 Unknown error:', error.message);
        throw new Error(`Failed to get response from Ollama: ${error.message}`);
      }
    }
  }

  async generateThoughtProcess(userInput: string, classification: ClassificationResult, history: ChatMessage[]): Promise<string> {
    console.log('🧠 Generating chain-of-thought reasoning...');
    
    const thoughtPrompt = `You are an AI assistant thinking through a user's request step by step. Show your reasoning process clearly.

User request: "${userInput}"
Classification: ${classification.type}

Think through this step by step:
1. What is the user asking for?
2. What information do I need to provide a good answer?
3. What approach should I take?
4. Are there any potential issues or considerations?

Be concise but thorough in your reasoning. This is your internal thought process.`;

    try {
      const thoughtProcess = await this.chat([
        { role: 'user', content: thoughtPrompt, timestamp: new Date() }
      ]);
      console.log('🧠 Generated thought process successfully');
      return thoughtProcess;
    } catch (error) {
      console.error('Error generating thought process:', error);
      return "I'm analyzing your request and considering how best to respond...";
    }
  }

  async classifyInput(userInput: string): Promise<ClassificationResult> {
    const classificationPrompt = `
Classify this user input into one of these categories:
- general: Regular conversation, questions, casual chat
- web_search: Requests for current information, news, research, "search for", "look up"
- code_analysis: Code review, debugging, programming questions, technical analysis
- data_analysis: Data processing, statistics, analysis of datasets, charts

User input: "${userInput}"

Respond with only the category name (general/web_search/code_analysis/data_analysis).`;

    try {
      const response = await this.chat([
        { role: 'user', content: classificationPrompt, timestamp: new Date() }
      ]);

      const type = response.trim().toLowerCase() as ClassificationResult['type'];
      
      if (!['general', 'web_search', 'code_analysis', 'data_analysis'].includes(type)) {
        return { type: 'general', confidence: 0.5 };
      }

      return { type, confidence: 0.8 };
    } catch (error) {
      console.error('Classification error:', error);
      return { type: 'general', confidence: 0.5 };
    }
  }
}