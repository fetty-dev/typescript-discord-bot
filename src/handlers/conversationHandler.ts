import { Message, ThreadChannel } from 'discord.js';
import { OllamaClient } from '../utils/ollama';
import { MemoryManager } from '../utils/memory';
import { ThreadManager } from './threadManager';
import { ChatMessage, ClassificationResult } from '../types';
import { config } from '../config';

export class ConversationHandler {
  private ollama: OllamaClient;
  private memoryManager: MemoryManager;
  private threadManager: ThreadManager;

  constructor() {
    this.ollama = new OllamaClient();
    this.memoryManager = new MemoryManager();
    this.threadManager = new ThreadManager();
  }

  async handleMessage(message: Message, thread: ThreadChannel): Promise<void> {
    console.log('💬 ConversationHandler: Starting message processing');
    
    try {
      const userId = message.author.id;
      const guildId = message.guild!.id;
      const userInput = message.content;
      
      console.log(`📝 Processing message from ${message.author.username}: "${userInput}"`);

      // Add user message to memory
      console.log('💾 Adding user message to memory...');
      const userMessage: ChatMessage = {
        role: 'user',
        content: userInput,
        timestamp: new Date()
      };
      
      await this.memoryManager.addChatMessage(userId, guildId, userMessage);
      console.log('✅ User message added to memory');

      // Show typing indicator
      console.log('⌨️ Showing typing indicator...');
      await thread.sendTyping();

      // Start parallel processing for better performance
      console.log('🚀 Starting parallel processing...');
      
      const [classification, recentMessages] = await Promise.all([
        // Classify the input
        (async () => {
          console.log('🏷️ Classifying user input...');
          const result = await this.ollama.classifyInput(userInput);
          console.log(`🏷️ Classification result: ${result.type} (confidence: ${result.confidence})`);
          return result;
        })(),
        
        // Get recent conversation history
        (async () => {
          console.log('📚 Fetching conversation history...');
          const messages = await this.memoryManager.getRecentMessages(userId, guildId, 10);
          console.log(`📚 Retrieved ${messages.length} recent messages`);
          return messages;
        })()
      ]);

      // Create thought process thread and generate response in parallel
      const [thoughtThread, response] = await Promise.all([
        // Create thought thread (non-blocking) - only if enabled
        (async () => {
          if (!config.enableThoughtThreads) {
            console.log('🧠 Thought threads disabled');
            return null;
          }
          
          try {
            const thoughtThread = await this.threadManager.createThoughtThread(thread, userInput);
            if (thoughtThread) {
              // Generate and send thought process
              const thoughtProcess = await this.ollama.generateThoughtProcess(userInput, classification, recentMessages);
              await thoughtThread.send(`**Chain of Thought Reasoning:**\n\n${thoughtProcess}`);
              console.log('🧠 Thought process sent to thought thread');
            }
            return thoughtThread;
          } catch (error: any) {
            console.log('⚠️ Could not create thought thread, continuing without it');
            return null;
          }
        })(),
        
        // Generate main response
        (async () => {
          console.log('🤖 Generating AI response...');
          const response = await this.generateResponse(userInput, classification, recentMessages);
          console.log(`🤖 Generated response (${response.length} chars): ${response.substring(0, 100)}...`);
          return response;
        })()
      ]);

      // Send main response
      console.log('📤 Sending response to thread...');
      await thread.send(response);
      console.log('✅ Response sent successfully');
      
      if (thoughtThread) {
        console.log(`🧠 Thought process available in: ${thoughtThread.name}`);
      }

      // Add bot response to memory
      console.log('💾 Adding bot response to memory...');
      const botMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      await this.memoryManager.addChatMessage(userId, guildId, botMessage);
      console.log('✅ Bot response added to memory');
      console.log('🎉 Message processing completed successfully');

    } catch (error: any) {
      console.error('💥 Critical error in conversation handler:', error);
      console.error('Stack trace:', error.stack);
      
      try {
        await thread.send('Sorry, I encountered an error processing your message. Please try again or contact support.');
        console.log('⚠️ Error message sent to user');
      } catch (sendError) {
        console.error('💥 Failed to send error message to user:', sendError);
      }
    }
  }

  private async generateResponse(
    userInput: string, 
    classification: ClassificationResult, 
    history: ChatMessage[]
  ): Promise<string> {
    const systemPrompts = {
      general: `You are genesis, a helpful conversational AI assistant in a Discord chat. Be friendly, natural, and engaging. Keep responses concise but informative. Remember the conversation context.`,
      
      web_search: `You are a helpful AI assistant. The user is asking for information that might require web search, but you don't have real-time web access. Acknowledge this limitation and provide the best information you can based on your training, while suggesting they verify current information from reliable sources.`,
      
      code_analysis: `You are an expert programming assistant. Help with code review, debugging, explaining concepts, and providing programming solutions. Be precise and include code examples when helpful.`,
      
      data_analysis: `You are a data analysis expert. Help interpret data, suggest analysis approaches, explain statistical concepts, and provide insights. Be clear and methodical in your explanations.`
    };

    const systemPrompt = systemPrompts[classification.type];
    
    // Prepare conversation context
    const contextMessages = history.slice(-8); // Last 8 messages for context
    
    try {
      return await this.ollama.chat([
        ...contextMessages,
        { role: 'user', content: userInput, timestamp: new Date() }
      ], systemPrompt);
    } catch (error) {
      console.error('Error generating response:', error);
      return "I'm having trouble generating a response right now. Could you please try again shartie?";
    }
  }
}