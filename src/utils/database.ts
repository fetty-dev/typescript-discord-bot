import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase(): Promise<void> {
  console.log(`🗄️ Connecting to MongoDB at: fart`);
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB successfully');
    
    // Test the connection
    const db = mongoose.connection.db;
    await db?.admin().ping();
    console.log('🏓 MongoDB connection verified with ping');
    
  } catch (error) {
    console.error('💥 MongoDB connection error:', error);
    console.error('💡 Make sure MongoDB is running and the connection string is correct');
    process.exit(1);
  }
}

const userMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  chatHistory: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  preferences: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
  threadId: String
}, {
  timestamps: true
});

userMemorySchema.index({ userId: 1, guildId: 1 }, { unique: true });

export const UserMemoryModel = mongoose.model('UserMemory', userMemorySchema);