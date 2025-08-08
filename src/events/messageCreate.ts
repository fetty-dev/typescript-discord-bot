import { Message, ChannelType } from 'discord.js';
import { ThreadManager } from '../handlers/threadManager';
import { ConversationHandler } from '../handlers/conversationHandler';
import { config } from '../config';

const threadManager = new ThreadManager();
const conversationHandler = new ConversationHandler();

export async function handleMessageCreate(message: Message): Promise<void> {
  console.log(`📨 Message received: "${message.content}" in ${message.channel.type === ChannelType.GuildText ? `#${message.channel.name}` : 'DM/Thread'} by ${message.author.username}`);
  
  // Ignore bot messages
  if (message.author.bot) {
    console.log('🤖 Ignoring bot message');
    return;
  }

  // Ignore messages without guild context
  if (!message.guild) {
    console.log('🚫 Ignoring DM message');
    return;
  }

  try {
    console.log(`🔍 Channel details - Type: ${message.channel.type}, Name: ${message.channel.type === ChannelType.GuildText ? message.channel.name : 'N/A'}`);
    console.log(`🎯 Looking for channel: "${config.genesisChannelName}"`);
    
    // Check if message is in genesis channel (create/find thread)
    const isGenesisChannel = message.channel.type === ChannelType.GuildText && (
      message.channel.name === config.genesisChannelName || 
      message.channel.id === config.genesisChannelName
    );
    
    if (isGenesisChannel) {
      console.log('✅ Message is in genesis channel, creating/finding thread...');
      
      const thread = await threadManager.findOrCreateUserThread(message);
      if (thread) {
        console.log(`🧵 Thread ${thread.id} ready, handling message...`);
        
        // Send initial response in the thread
        await conversationHandler.handleMessage(message, thread);
        
        // Delete original message to keep genesis channel clean
        try {
          await message.delete();
          console.log('🗑️ Original message deleted');
        } catch (error) {
          console.log('⚠️ Could not delete original message (might lack permissions):', error);
        }
      } else {
        console.log('❌ Failed to create/find thread');
      }
      return;
    }

    // Check if message is in a user's thread
    if (await threadManager.handleThreadMessage(message)) {
      console.log('🧵 Message is in a user thread');
      const thread = message.channel as any; // ThreadChannel
      await conversationHandler.handleMessage(message, thread);
    } else {
      console.log('🔇 Message ignored - not in genesis or user thread');
    }

  } catch (error: any) {
    console.error('💥 Critical error in message handler:', error);
    console.error('Stack trace:', error.stack);
    
    // Try to send error message to user
    try {
      await message.reply('Sorry, I encountered an error processing your message. Please try again or contact support.');
    } catch (replyError) {
      console.error('Failed to send error reply:', replyError);
    }
  }
}