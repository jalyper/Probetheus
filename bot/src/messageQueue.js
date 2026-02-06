// messageQueue.js
// p-queue wrapper with concurrency 1, cancel support, status tracking

const PQueue = require('p-queue').default;
const { runClaudeCode, cancelProcess } = require('./claudeCodeRunner.js');
const { splitMessage, formatToolStatus } = require('./responseFormatter.js');
const { handleError } = require('./errorHandler.js');
const { config } = require('./config.js');

class MessageQueue {
  constructor() {
    this.queue = new PQueue({ concurrency: 1 });
    this.currentProcess = null;
    this.isProcessing = false;
  }

  async enqueue(discordMessage, userMessage, discordClient) {
    const queuePosition = this.queue.size;

    const promise = this.queue.add(() =>
      this.processMessage(discordMessage, userMessage, discordClient)
    );

    // If message was queued (not immediately processed), notify user
    if (queuePosition > 0) {
      try {
        await discordMessage.reply(`Queued — ${queuePosition} message(s) ahead of you`);
      } catch (err) {
        console.error('[messageQueue] Failed to send queue notification:', err.message);
      }
    }

    return promise;
  }

  async processMessage(discordMessage, userMessage, discordClient) {
    this.isProcessing = true;
    let lastStatusTime = 0; // Start at 0 so first tool event always sends status
    let typingInterval = null;

    try {
      // Send initial acknowledgement
      await discordMessage.channel.send('⏳ Processing your request...').catch(err =>
        console.error('[messageQueue] Failed to send acknowledgement:', err.message)
      );

      // Keep typing indicator active (refreshes every 8 seconds)
      const refreshTyping = () => {
        discordMessage.channel.sendTyping().catch(() => {});
      };
      refreshTyping();
      typingInterval = setInterval(refreshTyping, 8000);

      const result = runClaudeCode(userMessage, {
        workspacePath: config.WORKSPACE_DIR,
        channel: discordMessage.channel,

        onToolUse: ({ tool, detail }) => {
          const now = Date.now();
          // Send status updates every 10 seconds (more frequent for better feedback)
          if (now - lastStatusTime >= 10000) {
            const statusMessage = formatToolStatus({ tool, detail });
            discordMessage.channel.send(statusMessage).catch(err =>
              console.error('[messageQueue] Failed to send tool status:', err.message)
            );
            lastStatusTime = now;
          }
        },

        onAgentSpawn: (agentInfo) => {
          // Called when Claude spawns a subagent/task
          const agentMessage = `🤖 Spawning agent: **${agentInfo.type || 'worker'}** — ${agentInfo.description || 'working...'}`;
          discordMessage.channel.send(agentMessage).catch(err =>
            console.error('[messageQueue] Failed to send agent status:', err.message)
          );
        },

        onTextDelta: (text) => {
          // No-op during streaming - we send final output only
        },

        onComplete: async (fullOutput) => {
          // Split message and send chunks sequentially
          const chunks = splitMessage(fullOutput);
          for (let i = 0; i < chunks.length; i++) {
            try {
              await discordMessage.channel.send(chunks[i]);
              // Small delay between chunks to avoid rate limits
              if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
            } catch (err) {
              console.error('[messageQueue] Failed to send response chunk:', err.message);
              await handleError(err, 'sending response chunk', discordClient);
            }
          }
        },

        onError: async (error) => {
          const errorMessage = await handleError(error, 'processing message', discordClient);
          try {
            await discordMessage.channel.send(errorMessage);
          } catch (sendErr) {
            console.error('[messageQueue] Failed to send error message to channel:', sendErr.message);
          }
        }
      });

      this.currentProcess = result.process;
      await result.promise;
    } finally {
      // Clear typing indicator interval
      if (typingInterval) {
        clearInterval(typingInterval);
      }
      this.currentProcess = null;
      this.isProcessing = false;
    }
  }

  cancel() {
    if (this.currentProcess) {
      cancelProcess(this.currentProcess);
    }
    // Clear pending messages from queue
    this.queue.clear();
  }

  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.queue.size,
      pending: this.queue.pending
    };
  }
}

module.exports = { MessageQueue };
