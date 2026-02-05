// Probetheus Discord Bot
// Owner-only authorization with silent rejection for unauthorized users

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config } = require('./config.js');

// Initialize Discord client with required intents for DMs
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent  // Privileged intent - must be enabled in Portal
  ],
  partials: [Partials.Channel]  // CRITICAL for DM support
});

// Bot ready event
client.once('ready', () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
  console.log(`[BOT] Owner ID: ${config.DISCORD_OWNER_ID}`);

  // Set custom status
  client.user.setPresence({
    activities: [{ name: config.BOT_STATUS }],
    status: 'online'
  });

  console.log(`[BOT] Status set to: ${config.BOT_STATUS}`);
  console.log('[BOT] Ready to receive messages from owner');
});

// Message handler with owner-only authorization
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Authorization: silent rejection for non-owners
  if (message.author.id !== config.DISCORD_OWNER_ID) {
    console.warn('[SECURITY] Unauthorized access attempt:', {
      userId: message.author.id,
      username: message.author.tag,
      timestamp: new Date().toISOString(),
      messagePreview: message.content.substring(0, 50)
    });
    return; // Silent ignore - no response, no reaction, no acknowledgment
  }

  // Owner message received
  console.log(`[MESSAGE] ${message.author.tag}: ${message.content}`);

  // Phase 1: Simple acknowledgment to verify bot works
  // Phase 2 will replace this with Gateway forwarding
  await message.reply('Received: ' + message.content.substring(0, 100));
});

// Error handling
client.on('error', (error) => {
  console.error('[BOT] Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('[PROCESS] Unhandled promise rejection:', error);
});

// Login to Discord
client.login(config.DISCORD_BOT_TOKEN).catch((error) => {
  console.error('[BOT] Failed to login:', error);
  process.exit(1);
});
