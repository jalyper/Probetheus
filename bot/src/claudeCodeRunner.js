// claudeCodeRunner.js
// Spawns Claude Code as subprocess, parses stream-json output, handles timeouts and retries

const { spawn } = require('child_process');
const readline = require('readline');

// Track whether this is first message in bot session (no --continue for first)
let sessionStarted = false;

// Track cancelled processes to avoid retry
const cancelledProcesses = new WeakSet();

/**
 * Run Claude Code as a subprocess with stream-json output
 *
 * @param {string} message - The prompt/message for Claude Code
 * @param {Object} options - Configuration options
 * @param {string} options.workspacePath - Working directory for Claude Code
 * @param {Function} options.onToolUse - Called when tool use detected: { tool, detail }
 * @param {Function} options.onTextDelta - Called on text output: (text)
 * @param {Function} options.onComplete - Called on success: (fullOutput)
 * @param {Function} options.onError - Called on error: (error)
 * @param {Object} options.channel - Discord channel for timeout notifications
 * @param {boolean} options.isRetry - Internal flag for retry tracking
 * @returns {Object} - { process: ChildProcess, promise: Promise }
 */
function runClaudeCode(message, options) {
  const {
    workspacePath,
    onToolUse,
    onAgentSpawn,
    onTextDelta,
    onComplete,
    onError,
    channel,
    isRetry = false
  } = options;

  // Add GSD workflow context to the prompt
  const gsdPrefix = `You are Probetheus, a development assistant for this project. Use the GSD workflow (/gsd:* skills) for planning and development tasks. Available commands include /gsd:progress, /gsd:plan-phase, /gsd:execute-phase, /gsd:verify-work, and others. For simple questions, respond directly. For development work, use GSD.

User request: `;
  const fullPrompt = gsdPrefix + message;

  const args = [
    '-p', fullPrompt,
    '--output-format', 'stream-json',
    '--verbose',
    '--max-turns', '25',
    '--dangerously-skip-permissions'  // Skip permission prompts in headless mode
  ];

  // Continue conversation after first message
  if (sessionStarted) {
    args.push('--continue');
  }
  sessionStarted = true;

  // Use full path to claude binary — PM2 may not have it in PATH
  const claudeBinary = '/home/keato/.local/bin/claude';

  // Ensure PATH includes claude's directory
  const env = { ...process.env };
  if (!env.PATH || !env.PATH.includes('/home/keato/.local/bin')) {
    env.PATH = `/home/keato/.local/bin:${env.PATH || ''}`;
  }

  // Clear any Claude-specific env vars that might interfere
  delete env.CLAUDE_CODE_SESSION;
  delete env.CLAUDE_SESSION_ID;

  // Build the full command as a string for script wrapper
  // Escape single quotes in arguments for shell: ' -> '\''
  const escapeForShell = (str) => str.replace(/'/g, "'\\''");
  const fullCommand = `${claudeBinary} ${args.map(a => `'${escapeForShell(a)}'`).join(' ')}`;
  console.log(`[claudeCodeRunner] Command: ${claudeBinary} -p '...' (${fullPrompt.length} chars)`);
  console.log(`[claudeCodeRunner] CWD: ${workspacePath}`);

  // Use 'script' to provide a pseudo-TTY - Claude CLI requires it for output
  const childProcess = spawn('script', ['-q', '-c', fullCommand, '/dev/null'], {
    cwd: workspacePath,
    env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Track accumulated output
  let fullOutput = '';
  let stderrOutput = '';

  // Track tool use via content blocks
  const contentBlocks = new Map(); // index -> { type, name, input }

  // Soft timeout tracking (notify every 2 minutes, don't kill)
  let timeoutMinutes = 0;
  const timeoutInterval = setInterval(() => {
    timeoutMinutes += 2;
    if (channel && channel.send) {
      channel.send(`Still working... ${timeoutMinutes} min elapsed`)
        .catch(err => console.error('[claudeCodeRunner] Failed to send timeout notification:', err));
    }
  }, 120000); // 2 minutes

  // Parse stream-json from stdout
  const rl = readline.createInterface({
    input: childProcess.stdout,
    crlfDelay: Infinity
  });

  rl.on('line', (line) => {
    // Skip terminal escape sequences from 'script' wrapper
    if (!line.startsWith('{')) {
      return;
    }

    try {
      const event = JSON.parse(line);

      // Handle assistant message (contains final response text)
      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            fullOutput += block.text;
            if (onTextDelta) {
              onTextDelta(block.text);
            }
          }
        }
      }

      // Handle result event (fallback if assistant didn't have text)
      if (event.type === 'result' && event.result && !fullOutput) {
        fullOutput = event.result;
      }

      // Handle text deltas (legacy format, keep for compatibility)
      if (event.type === 'text_delta' && event.text) {
        fullOutput += event.text;
        if (onTextDelta) {
          onTextDelta(event.text);
        }
      }

      // Handle content block start (tool use)
      if (event.type === 'content_block_start' && event.content_block) {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          const index = event.index || 0;
          contentBlocks.set(index, {
            type: 'tool_use',
            name: block.name,
            input: {}
          });
        }
      }

      // Handle input JSON deltas (streaming tool input)
      if (event.type === 'input_json_delta' && event.delta) {
        const index = event.index || 0;
        const block = contentBlocks.get(index);
        if (block && block.type === 'tool_use') {
          // Accumulate the delta (simple concatenation for now)
          // In real stream-json, this would be partial JSON objects
          try {
            const parsedDelta = JSON.parse(event.delta);
            block.input = { ...block.input, ...parsedDelta };
          } catch (e) {
            // Delta might be partial JSON, skip parse errors
          }
        }
      }

      // Handle content block completion (extract tool details)
      if (event.type === 'content_block_stop') {
        const index = event.index || 0;
        const block = contentBlocks.get(index);
        if (block && block.type === 'tool_use') {
          const toolName = block.name;
          let detail = '';

          // Special handling for Task tool (agent spawning)
          if (toolName === 'Task' && onAgentSpawn) {
            onAgentSpawn({
              type: block.input?.subagent_type || 'worker',
              description: block.input?.description || block.input?.prompt?.substring(0, 80) || 'Working...'
            });
          }

          // Extract detail based on tool type
          if (toolName === 'Edit' || toolName === 'Write' || toolName === 'Read') {
            const filePath = block.input?.file_path || '';
            detail = filePath.split('/').pop() || filePath; // basename
          } else if (toolName === 'Bash') {
            const command = block.input?.command || '';
            detail = command.substring(0, 60);
          } else if (toolName === 'Grep' || toolName === 'Glob') {
            detail = 'Searching files...';
          } else if (toolName === 'Task') {
            detail = `Agent: ${block.input?.subagent_type || 'worker'}`;
          } else if (toolName === 'Skill') {
            detail = `Skill: ${block.input?.skill || 'unknown'}`;
          } else {
            detail = 'Working...';
          }

          if (onToolUse) {
            onToolUse({ tool: toolName, detail });
          }
        }
      }

    } catch (err) {
      // JSON parse error - skip this line, continue parsing
      // (Claude Code may output non-JSON lines on stdout)
    }
  });

  // Log process PID
  console.log(`[claudeCodeRunner] Process spawned, PID: ${childProcess.pid}`);

  // Collect stderr (used for progress, not necessarily errors)
  childProcess.stderr.on('data', (data) => {
    const text = data.toString();
    stderrOutput += text;
    console.log(`[claudeCodeRunner] stderr: ${text.trim()}`);
  });

  // Handle process exit
  const promise = new Promise((resolve, reject) => {
    childProcess.on('error', (err) => {
      clearInterval(timeoutInterval);

      // ENOENT - claude not found
      if (err.code === 'ENOENT') {
        // Try full path fallback
        if (claudeCommand === 'claude') {
          claudeCommand = '/home/keato/.local/bin/claude';
          // Retry with full path (recursive call, same isRetry flag)
          const fallbackResult = runClaudeCode(message, { ...options, isRetry });
          fallbackResult.promise.then(resolve).catch(reject);
          return;
        }

        const enoentError = new Error('Cannot find Claude Code CLI. Check installation and PATH.');
        enoentError.code = 'ENOENT';
        if (onError) {
          onError(enoentError);
        }
        reject(enoentError);
        return;
      }

      if (onError) {
        onError(err);
      }
      reject(err);
    });

    childProcess.on('exit', (code, signal) => {
      clearInterval(timeoutInterval);

      // Successful exit
      if (code === 0) {
        if (onComplete) {
          onComplete(fullOutput);
        }
        resolve(fullOutput);
        return;
      }

      // Cancelled by user (SIGTERM)
      if (signal === 'SIGTERM' || cancelledProcesses.has(childProcess)) {
        const cancelError = new Error('Process cancelled by user');
        cancelError.code = 'CANCELLED';
        if (onError) {
          onError(cancelError);
        }
        reject(cancelError);
        return;
      }

      // Non-zero exit - retry once if this is first attempt
      if (!isRetry) {
        console.log('[claudeCodeRunner] Process failed with exit code', code, '- retrying in 2 seconds...');
        setTimeout(() => {
          const retryResult = runClaudeCode(message, { ...options, isRetry: true });
          retryResult.promise.then(resolve).catch(reject);
        }, 2000);
        return;
      }

      // Retry exhausted
      const error = new Error(`Claude Code failed with exit code ${code} after retry`);
      error.code = 'RETRY_EXHAUSTED';
      error.exitCode = code;
      error.stderr = stderrOutput;
      if (onError) {
        onError(error);
      }
      reject(error);
    });
  });

  return { process: childProcess, promise };
}

/**
 * Cancel a running Claude Code process gracefully
 * Sends SIGTERM, waits 5 seconds, then SIGKILL if still running
 *
 * @param {ChildProcess} childProcess - The process to cancel
 */
function cancelProcess(childProcess) {
  if (!childProcess || childProcess.killed) {
    return;
  }

  // Mark as cancelled to prevent retry
  cancelledProcesses.add(childProcess);

  // Send SIGTERM
  childProcess.kill('SIGTERM');

  // Set timeout for SIGKILL
  setTimeout(() => {
    if (!childProcess.killed) {
      console.log('[claudeCodeRunner] Process did not exit after SIGTERM, sending SIGKILL');
      childProcess.kill('SIGKILL');
    }
  }, 5000);
}

module.exports = {
  runClaudeCode,
  cancelProcess
};
