import { UserMemoryModel } from './database';
import { UserMemory, ChatMessage } from '../types';

export class MemoryManager {
  async getUserMemory(userId: string, guildId: string): Promise<UserMemory | null> {
    console.log(`💾 MemoryManager: Fetching memory for user ${userId} in guild ${guildId}`);
    try {
      const memory = await UserMemoryModel.findOne({ userId, guildId });
      const result = memory ? memory.toObject() : null;
      console.log(`💾 Memory fetch result: ${result ? 'Found' : 'Not found'}`);
      return result;
    } catch (error) {
      console.error('💥 Error fetching user memory:', error);
      return null;
    }
  }

  async createUserMemory(userId: string, guildId: string, threadId?: string): Promise<UserMemory> {
    try {
      const memory = new UserMemoryModel({
        userId,
        guildId,
        chatHistory: [],
        preferences: {},
        threadId
      });
      
      await memory.save();
      return memory.toObject();
    } catch (error) {
      console.error('Error creating user memory:', error);
      throw error;
    }
  }

  async addChatMessage(userId: string, guildId: string, message: ChatMessage): Promise<void> {
    try {
      await UserMemoryModel.updateOne(
        { userId, guildId },
        { 
          $push: { 
            chatHistory: {
              $each: [message],
              $slice: -50 // Keep only last 50 messages
            }
          }
        }
      );
    } catch (error) {
      console.error('Error adding chat message:', error);
    }
  }

  async updateThreadId(userId: string, guildId: string, threadId: string): Promise<void> {
    try {
      await UserMemoryModel.updateOne(
        { userId, guildId },
        { threadId }
      );
    } catch (error) {
      console.error('Error updating thread ID:', error);
    }
  }

  async getRecentMessages(userId: string, guildId: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      const memory = await UserMemoryModel.findOne(
        { userId, guildId },
        { chatHistory: { $slice: -limit } }
      );
      
      return memory?.chatHistory || [];
    } catch (error) {
      console.error('Error fetching recent messages:', error);
      return [];
    }
  }
}