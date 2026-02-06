# Discord Bot + Claude Code Integration Quickstart

This document captures critical setup knowledge for building Discord bots that integrate with Claude Code CLI.

## Environment Requirements

### WSL2 + Node.js
```bash
# Node.js via nvm (NOT system package)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Verify
node --version  # v22.x recommended
which node      # Should be ~/.nvm/versions/node/...
```

### PM2 Process Manager
```bash
npm install -g pm2
pm2 startup  # Enable auto-start on WSL boot
```

### Claude Code CLI
```bash
# Verify installation
which claude  # /home/<user>/.local/bin/claude

# Must be authenticated
claude --version
```

---

## Discord Bot Setup

### Required Intents (in code)
```javascript
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required for caching
    GatewayIntentBits.DirectMessages,   // For DM support
    GatewayIntentBits.MessageContent    // PRIVILEGED - must enable in Portal
  ],
  partials: [Partials.Channel, Partials.Message]  // CRITICAL for DMs
});
```

### Discord Developer Portal Settings
1. Go to https://discord.com/developers/applications
2. Select your bot → **Bot** settings
3. Enable **MESSAGE CONTENT INTENT** under Privileged Gateway Intents
4. Without this, bot receives no message content!

---

## Claude Code CLI Integration

### Critical: PTY Wrapper Required
Claude CLI requires a terminal (TTY) to produce output. When spawning as subprocess, use `script` to provide a pseudo-TTY:

```javascript
const { spawn } = require('child_process');

// WRONG - produces no output
const child = spawn('claude', ['-p', message]);

// CORRECT - wrap with script for PTY
const fullCommand = `/path/to/claude -p '${escapedMessage}' --output-format stream-json`;
const child = spawn('script', ['-q', '-c', fullCommand, '/dev/null'], {
  cwd: workspacePath,
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### Shell Quote Escaping
Messages containing apostrophes break shell commands. Escape single quotes:

```javascript
const escapeForShell = (str) => str.replace(/'/g, "'\\''");
const safeMessage = escapeForShell(userMessage);
const command = `claude -p '${safeMessage}'`;
```

### Stream-JSON Parsing
Claude CLI with `--output-format stream-json` outputs newline-delimited JSON:

```javascript
const readline = require('readline');

const rl = readline.createInterface({
  input: childProcess.stdout,
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  // Skip terminal escape sequences from 'script' wrapper
  if (!line.startsWith('{')) return;

  try {
    const event = JSON.parse(line);

    // Extract text from assistant messages
    if (event.type === 'assistant' && event.message?.content) {
      for (const block of event.message.content) {
        if (block.type === 'text') {
          output += block.text;
        }
      }
    }

    // Fallback: result event contains final text
    if (event.type === 'result' && event.result) {
      // Use if output is empty
    }
  } catch (e) {
    // Skip non-JSON lines
  }
});
```

### Recommended CLI Flags
```javascript
const args = [
  '-p', prompt,
  '--output-format', 'stream-json',  // Structured output
  '--verbose',                        // More detail
  '--max-turns', '25',               // Limit conversation length
  '--dangerously-skip-permissions'   // Skip prompts in headless mode
];

// For continuing conversations:
if (sessionStarted) {
  args.push('--continue');
}
```

---

## PM2 Configuration

### CRITICAL: Use Fork Mode, Not Cluster
Cluster mode breaks WebSocket connections (Discord gateway fails):

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-bot',
    script: './src/bot.js',
    exec_mode: 'fork',  // MUST be fork, NOT cluster
    instances: 1,
    autorestart: true,
    // ... other options
  }]
};
```

### Common PM2 Commands
```bash
# Start
pm2 start ecosystem.config.js

# Restart (picks up code changes)
pm2 restart my-bot

# Full restart (picks up config changes like exec_mode)
pm2 stop my-bot && pm2 delete my-bot && pm2 start ecosystem.config.js

# Logs
pm2 logs my-bot --lines 50

# Status
pm2 status
```

---

## Common Pitfalls & Solutions

| Problem | Cause | Solution |
|---------|-------|----------|
| Bot online but no messages received | Missing MESSAGE_CONTENT intent in Discord Portal | Enable in Bot settings |
| Bot receives messages but Claude produces no output | No PTY for Claude CLI | Wrap with `script -q -c` |
| Shell error "unexpected EOF matching quote" | Apostrophes in message | Escape with `'\\''` |
| Discord WebSocket disconnects | PM2 cluster mode | Use `exec_mode: 'fork'` |
| `pm2 restart` doesn't pick up changes | Cached config | Stop, delete, then start fresh |
| Claude process runs but no events parsed | Wrong event types | Parse `assistant` events, not `text_delta` |
| Empty message error on Discord send | No text extracted | Check `message.content[].text` path |

---

## UX Best Practices

### Immediate Feedback
```javascript
// Acknowledge receipt immediately
await channel.send('⏳ Processing your request...');
```

### Persistent Typing Indicator
Discord typing indicator lasts ~10 seconds. Refresh it:
```javascript
const refreshTyping = () => channel.sendTyping().catch(() => {});
refreshTyping();
const typingInterval = setInterval(refreshTyping, 8000);
// Clear when done: clearInterval(typingInterval)
```

### Progress Updates
For long operations, notify periodically:
```javascript
const timeoutInterval = setInterval(() => {
  minutes += 2;
  channel.send(`Still working... ${minutes} min elapsed`);
}, 120000);
```

---

## File Structure
```
bot/
├── ecosystem.config.js    # PM2 configuration
├── .env                   # Secrets (TOKEN, OWNER_ID)
├── .env.example           # Template
├── package.json
├── logs/
│   ├── out.log           # stdout
│   └── err.log           # stderr
└── src/
    ├── bot.js            # Discord client, event handlers
    ├── claudeCodeRunner.js  # Spawns Claude CLI
    ├── messageQueue.js   # Queues messages, manages state
    ├── config.js         # Loads .env
    ├── errorHandler.js   # Error formatting
    └── responseFormatter.js  # Message splitting
```

---

## Quick Test Checklist

1. [ ] `pm2 status` shows bot as `online` in `fork` mode
2. [ ] Bot appears online in Discord
3. [ ] Send DM → Bot shows typing indicator
4. [ ] Bot responds with Claude's output
5. [ ] `cancel` command works
6. [ ] Long operations show "Still working..." messages

---

## Useful Debug Commands

```bash
# Check if Claude process is running
ps aux | grep claude

# Watch logs in real-time
tail -f /path/to/bot/logs/out.log

# Check for errors
tail -20 /path/to/bot/logs/err.log

# Test Claude CLI directly (won't work in nested Claude session)
claude -p "hello" --output-format stream-json
```
