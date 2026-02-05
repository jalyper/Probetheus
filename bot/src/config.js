// Load environment variables from ../.env (one level up from src/)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// Export configuration object
const config = {
  DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN,
  DISCORD_OWNER_ID: process.env.DISCORD_OWNER_ID,
  BOT_STATUS: process.env.BOT_STATUS || 'Working on Probetheus',
  OPENCLAW_GATEWAY_URL: process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789'
};

// Validate required configuration
if (!config.DISCORD_BOT_TOKEN) {
  console.error('\n[ERROR] Missing required environment variable: DISCORD_BOT_TOKEN');
  console.error('Please create a .env file in the bot/ directory with:');
  console.error('  DISCORD_BOT_TOKEN=your_bot_token_here');
  console.error('\nSee .env.example for template.\n');
  process.exit(1);
}

if (!config.DISCORD_OWNER_ID) {
  console.error('\n[ERROR] Missing required environment variable: DISCORD_OWNER_ID');
  console.error('Please add to your .env file:');
  console.error('  DISCORD_OWNER_ID=your_discord_user_id_here');
  console.error('\nTo get your Discord user ID:');
  console.error('  1. Enable Developer Mode in Discord Settings > Advanced');
  console.error('  2. Right-click your username and select "Copy ID"\n');
  process.exit(1);
}

module.exports = { config };
