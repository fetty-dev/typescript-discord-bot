import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { connectDatabase } from './utils/database';
import { handleMessageCreate } from './events/messageCreate';
import { config } from './config';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

client.on('ready', async (c) => {
    console.log(`${c.user.username} is online!`);
    console.log(`Monitoring channel: #${config.genesisChannelName}`);
    console.log(`Ollama endpoint: ${config.ollamaApiUrl}`);
    console.log(`Using model: ${config.model}`);
});

client.on('messageCreate', handleMessageCreate);

async function start() {
    try {
        await connectDatabase();
        await client.login(config.token);
    } catch (error) {
        console.error('Failed to start bot:', error);
        process.exit(1);
    }
}

start();