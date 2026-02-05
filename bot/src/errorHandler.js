// errorHandler.js
// Error categorization, file logging, and owner DM notification

const fs = require('fs/promises');
const path = require('path');
const { formatErrorMessage } = require('./responseFormatter.js');

// DM cooldown tracking (60 seconds per error type)
const dmCooldowns = new Map();
const COOLDOWN_MS = 60000;

/**
 * Categorize an error into level, user message, and notification flag
 *
 * @param {Error} error - The error to categorize
 * @returns {Object} - { level, userMessage, shouldNotifyOwner }
 */
function categorizeError(error) {
  // Claude Code ENOENT (CLI not found)
  if (error.code === 'ENOENT') {
    return {
      level: 'error',
      userMessage: 'Cannot find Claude Code CLI. Check installation.',
      shouldNotifyOwner: true
    };
  }

  // Process cancelled by user
  if (error.code === 'CANCELLED') {
    return {
      level: 'info',
      userMessage: 'Task cancelled.',
      shouldNotifyOwner: false
    };
  }

  // Claude Code retry exhausted
  if (error.code === 'RETRY_EXHAUSTED') {
    const briefSummary = error.message.split('\n')[0]; // First line only
    return {
      level: 'error',
      userMessage: `Task failed after retry. Error: ${briefSummary}`,
      shouldNotifyOwner: true
    };
  }

  // Discord API error (message send failure)
  if (error.name === 'DiscordAPIError' || error.message?.includes('DiscordAPI')) {
    return {
      level: 'warning',
      userMessage: 'Failed to send response. Please try again.',
      shouldNotifyOwner: true
    };
  }

  // Claude Code non-zero exit (before retry)
  if (error.exitCode && !error.code) {
    return {
      level: 'error',
      userMessage: 'Claude Code encountered an error. Retrying...',
      shouldNotifyOwner: false // Retry will handle it
    };
  }

  // Unknown/unhandled error
  return {
    level: 'error',
    userMessage: 'Unexpected error occurred.',
    shouldNotifyOwner: true
  };
}

/**
 * Log an error to file with structured format
 *
 * @param {string} level - "error", "warning", or "info"
 * @param {string} message - Log message
 * @param {Object} details - Additional details (will be JSON stringified)
 */
async function logToFile(level, message, details = {}) {
  const logDir = path.join(__dirname, '..', 'logs');
  const logFile = path.join(logDir, 'errors.log');

  // Ensure log directory exists
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (err) {
    console.error('[errorHandler] Failed to create log directory:', err);
    return;
  }

  const timestamp = new Date().toISOString();
  const detailsJson = JSON.stringify(details);
  const logEntry = `[${timestamp}] [${level.toUpperCase()}] Message: ${message} | Details: ${detailsJson}\n`;

  try {
    await fs.appendFile(logFile, logEntry);
  } catch (err) {
    console.error('[errorHandler] Failed to write to log file:', err);
  }
}

/**
 * Send a DM to the bot owner with cooldown protection
 *
 * @param {Client} client - Discord.js client instance
 * @param {string} message - Message to send
 */
async function notifyOwner(client, message) {
  const { config } = require('./config.js');

  // Check cooldown
  const cooldownKey = message.substring(0, 50); // Use message prefix as key
  const now = Date.now();
  const lastSent = dmCooldowns.get(cooldownKey);

  if (lastSent && now - lastSent < COOLDOWN_MS) {
    console.log('[errorHandler] DM cooldown active, skipping notification');
    return;
  }

  try {
    const owner = await client.users.fetch(config.DISCORD_OWNER_ID);
    await owner.send(`**Bot Alert:** ${message}`);
    dmCooldowns.set(cooldownKey, now);
    console.log('[errorHandler] Owner notification sent');
  } catch (dmError) {
    // Can't DM owner — just log it, don't recurse
    console.error('[errorHandler] Failed to DM owner:', dmError.message);
  }
}

/**
 * Main error handler - categorizes, logs, and notifies as needed
 *
 * @param {Error} error - The error to handle
 * @param {string} context - Description of what was happening
 * @param {Client} discordClient - Discord.js client for owner DM
 * @returns {string} - User-facing error message
 */
async function handleError(error, context, discordClient) {
  try {
    // Categorize the error
    const { level, userMessage, shouldNotifyOwner } = categorizeError(error);

    // Log to file
    await logToFile(level, error.message, {
      context,
      stack: error.stack,
      code: error.code,
      exitCode: error.exitCode
    });

    // Notify owner if needed
    if (shouldNotifyOwner && discordClient) {
      const notificationMessage = `Error during ${context}: ${error.message}`;
      await notifyOwner(discordClient, notificationMessage);
    }

    // Return formatted user-facing message
    return formatErrorMessage(level, userMessage);

  } catch (handlerError) {
    // Error in the error handler itself - log to console and return safe message
    console.error('[errorHandler] Error in handleError:', handlerError);
    return formatErrorMessage('error', 'An unexpected error occurred.');
  }
}

module.exports = {
  handleError,
  logToFile,
  notifyOwner,
  categorizeError
};
