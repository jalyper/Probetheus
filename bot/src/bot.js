// Probetheus Discord Bot
// Full Claude Code message pipeline with queue, status updates, and error handling

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { config } = require('./config.js');
const { MessageQueue } = require('./messageQueue.js');
const { handleError } = require('./errorHandler.js');
const { formatErrorMessage } = require('./responseFormatter.js');

// Initialize Discord client with required intents for DMs
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent  // Privileged intent - must be enabled in Portal
  ],
  partials: [Partials.Channel]  // CRITICAL for DM support
});

// Initialize message queue
const messageQueue = new MessageQueue();

// Bot ready event
client.once('ready', () => {
  console.log(`[BOT] Logged in as ${client.user.tag}`);
  console.log(`[BOT] Owner ID: ${config.DISCORD_OWNER_ID}`);
  console.log(`[BOT] Workspace: ${config.WORKSPACE_DIR}`);

  // Set custom status
  client.user.setPresence({
    activities: [{ name: config.BOT_STATUS }],
    status: 'online'
  });

  console.log(`[BOT] Status set to: ${config.BOT_STATUS}`);
  console.log('[BOT] Ready to receive messages from owner');
});

// Message handler with full Claude Code pipeline
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

  // Handle "cancel" command
  if (message.content.toLowerCase().trim() === 'cancel') {
    const status = messageQueue.getStatus();
    if (status.isProcessing) {
      messageQueue.cancel();
      await message.reply('Cancelled current task and cleared queue.');
    } else {
      await message.reply('Nothing running to cancel.');
    }
    return;
  }

  // Log and queue the message for Claude Code processing
  console.log(`[MESSAGE] ${message.author.tag}: ${message.content}`);

  try {
    await messageQueue.enqueue(message, message.content, client);
  } catch (error) {
    await handleError(error, 'queuing message', client);
    try {
      await message.reply(formatErrorMessage('error', 'Failed to process your message. Please try again.'));
    } catch (replyError) {
      // Can't even reply - log it
      console.error('[ERROR] Failed to send error reply:', replyError.message);
    }
  }
});

// Enhanced error handling
client.on('error', async (error) => {
  console.error('[BOT] Discord client error:', error);
  await handleError(error, 'Discord client error', client);
});

process.on('unhandledRejection', async (error) => {
  console.error('[PROCESS] Unhandled promise rejection:', error);
  await handleError(error, 'unhandled rejection', client);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[BOT] Received SIGTERM, shutting down...');
  messageQueue.cancel(); // Kill any running Claude Code process
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[BOT] Received SIGINT, shutting down...');
  messageQueue.cancel();
  client.destroy();
  process.exit(0);
});

// Login to Discord
client.login(config.DISCORD_BOT_TOKEN).catch((error) => {
  console.error('[BOT] Failed to login:', error);
  process.exit(1);
});
