import { 
  Client, 
  Message, 
  TextChannel, 
  ThreadChannel, 
  ChannelType 
} from 'discord.js';
import { config } from '../config';
import { MemoryManager } from '../utils/memory';

export class ThreadManager {
  private memoryManager: MemoryManager;

  constructor() {
    this.memoryManager = new MemoryManager();
  }

  async findOrCreateUserThread(message: Message): Promise<ThreadChannel | null> {
    try {
      console.log('🔧 ThreadManager: Starting findOrCreateUserThread');
      
      const channel = message.channel;
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.log('❌ Channel is not a guild text channel');
        return null;
      }

      // Check if message is in genesis channel (by name or ID)
      const isGenesisChannel = channel.name === config.genesisChannelName || channel.id === config.genesisChannelName;
      if (!isGenesisChannel) {
        console.log(`❌ Channel "${channel.name}" (ID: ${channel.id}) is not genesis channel "${config.genesisChannelName}"`);
        return null;
      }

      const userId = message.author.id;
      const guildId = message.guild!.id;
      console.log(`👤 Processing for user ${message.author.username} (${userId}) in guild ${guildId}`);

      // Check bot permissions
      const botMember = message.guild!.members.cache.get(message.client.user!.id);
      const permissions = channel.permissionsFor(botMember!);
      
      console.log('🔐 Bot permissions check:');
      console.log(`  - Create Public Threads: ${permissions?.has('CreatePublicThreads')}`);
      console.log(`  - Manage Threads: ${permissions?.has('ManageThreads')}`);
      console.log(`  - Send Messages: ${permissions?.has('SendMessages')}`);
      console.log(`  - Manage Messages: ${permissions?.has('ManageMessages')}`);

      if (!permissions?.has('CreatePublicThreads')) {
        console.error('🚫 Bot lacks CreatePublicThreads permission');
        await message.reply('I need "Create Public Threads" permission to work properly.');
        return null;
      }

      // Check if user already has a memory record with thread ID
      console.log('💾 Checking user memory...');
      let userMemory = await this.memoryManager.getUserMemory(userId, guildId);
      console.log(`💾 User memory found: ${!!userMemory}, threadId: ${userMemory?.threadId}`);
      
      if (userMemory?.threadId) {
        console.log(`🔍 Looking for existing thread: ${userMemory.threadId}`);
        
        // Try to find existing thread
        const existingThread = channel.threads.cache.get(userMemory.threadId);
        if (existingThread) {
          console.log('✅ Found existing thread in cache');
          return existingThread;
        }
        
        // Thread might not be in cache, try to fetch it
        try {
          console.log('📡 Fetching thread from API...');
          const fetchedThread = await channel.threads.fetch(userMemory.threadId);
          if (fetchedThread) {
            console.log('✅ Found existing thread via API');
            return fetchedThread;
          }
        } catch (error: any) {
          console.log('⚠️ Thread not found, will create new one:', error.message);
        }
      }

      // Create new thread
      const threadName = `${message.author.displayName || message.author.username}'s Chat`;
      console.log(`🛠️ Creating new thread: "${threadName}"`);
      
      const thread = await (channel as TextChannel).threads.create({
        name: threadName,
        autoArchiveDuration: 1440, // 24 hours
        reason: 'User conversation thread'
      });

      console.log(`✅ Thread created successfully: ${thread.id}`);

      // Create or update user memory with thread ID
      if (!userMemory) {
        console.log('💾 Creating new user memory record');
        await this.memoryManager.createUserMemory(userId, guildId, thread.id);
      } else {
        console.log('💾 Updating existing user memory with new thread ID');
        await this.memoryManager.updateThreadId(userId, guildId, thread.id);
      }

      // Add the user to the thread
      console.log('👥 Adding user to thread...');
      await thread.members.add(userId);
      console.log('✅ User added to thread successfully');

      return thread;
    } catch (error: any) {
      console.error('💥 Critical error in findOrCreateUserThread:', error);
      console.error('Stack trace:', error.stack);
      
      // Try to inform the user
      try {
        await message.reply('Sorry, I encountered an error creating your conversation thread. Please check my permissions or try again.');
      } catch (replyError) {
        console.error('Failed to send error reply:', replyError);
      }
      
      return null;
    }
  }

  async handleThreadMessage(message: Message): Promise<boolean> {
    // Check if message is in a thread created by the bot
    if (message.channel.type !== ChannelType.PublicThread) {
      return false;
    }

    const thread = message.channel as ThreadChannel;
    const parentChannel = thread.parent;
    
    if (!parentChannel || parentChannel.name !== config.genesisChannelName) {
      return false;
    }

    // This is a thread message in genesis channel
    return true;
  }

  async createThoughtThread(parentThread: ThreadChannel, userMessage: string): Promise<ThreadChannel | null> {
    try {
      console.log('🧠 Creating thought process thread...');
      
      // Discord doesn't support nested threads, so create a sibling thread
      const parentChannel = parentThread.parent;
      if (parentChannel?.type === ChannelType.GuildText) {
        const thoughtThread = await parentChannel.threads.create({
          name: `🧠 ${parentThread.name} - Thoughts`,
          autoArchiveDuration: 60, // 1 hour - shorter for thought threads
          reason: 'AI chain-of-thought reasoning'
        });
        
        // Add the same user to the thought thread
        const userId = parentThread.name.split("'s Chat")[0]; // Extract username
        try {
          // Find user by searching thread members
          const members = await parentThread.members.fetch();
          const user = members.find(member => !member.user?.bot);
          if (user) {
            await thoughtThread.members.add(user.id);
          }
        } catch (memberError: any) {
          console.log('Could not add user to thought thread:', memberError.message);
        }
        
        console.log(`🧠 Thought thread created: ${thoughtThread.id}`);
        return thoughtThread;
      }
      
      return null;
      
    } catch (error: any) {
      console.error('💥 Error creating thought thread:', error);
      return null;
    }
  }
}