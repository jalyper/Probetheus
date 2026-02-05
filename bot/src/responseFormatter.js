// responseFormatter.js
// Discord message splitting at natural boundaries with code block state tracking
// Tool status formatting and error message formatting

/**
 * Split long text into Discord-safe chunks (max 2000 chars per chunk)
 * Splits at natural boundaries (paragraphs, between code blocks) preserving markdown
 *
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum chunk length (default 2000, leave margin at 1950)
 * @returns {string[]} - Array of chunks, each <= maxLength
 */
function splitMessage(text, maxLength = 2000) {
  // Leave margin for safety
  const safeMaxLength = maxLength - 50;

  // If text fits in one chunk, return it
  if (text.length <= safeMaxLength) {
    return [text];
  }

  const chunks = [];
  const lines = text.split('\n');

  let currentChunk = '';
  let insideCodeBlock = false;
  let codeBlockLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts/ends a code block
    if (line.trim().startsWith('```')) {
      if (!insideCodeBlock) {
        // Starting a code block
        insideCodeBlock = true;
        // Extract language hint (e.g., ```javascript -> "javascript")
        codeBlockLanguage = line.trim().substring(3).trim();
      } else {
        // Ending a code block
        insideCodeBlock = false;
        codeBlockLanguage = '';
      }
    }

    // Check if adding this line would exceed the limit
    const lineWithNewline = (currentChunk ? '\n' : '') + line;
    if ((currentChunk + lineWithNewline).length > safeMaxLength) {
      // Need to split here

      // If we're inside a code block, close it in current chunk
      if (insideCodeBlock) {
        currentChunk += '\n```';
      }

      // Flush current chunk
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // Start new chunk
      // If we were inside a code block, reopen it
      if (insideCodeBlock) {
        currentChunk = '```' + codeBlockLanguage + '\n' + line;
      } else {
        currentChunk = line;
      }
    } else {
      // Add line to current chunk
      currentChunk += lineWithNewline;
    }
  }

  // Flush final chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Safety check: if any single line is > safeMaxLength, hard-split it
  const finalChunks = [];
  for (const chunk of chunks) {
    if (chunk.length <= safeMaxLength) {
      finalChunks.push(chunk);
    } else {
      // Hard split at safeMaxLength
      for (let i = 0; i < chunk.length; i += safeMaxLength) {
        finalChunks.push(chunk.substring(i, i + safeMaxLength));
      }
    }
  }

  return finalChunks.length > 0 ? finalChunks : [text.substring(0, safeMaxLength)];
}

/**
 * Format a tool use event into a human-readable status string
 *
 * @param {Object} toolEvent - Tool use event with { tool, detail }
 * @returns {string} - Formatted status string
 */
function formatToolStatus(toolEvent) {
  const { tool, detail } = toolEvent;

  switch (tool) {
    case 'Edit':
    case 'Write':
      return `Editing ${detail}`;

    case 'Read':
      return `Reading ${detail}`;

    case 'Bash':
      return `Running: ${detail}`;

    case 'Grep':
    case 'Glob':
      return detail || 'Searching files...';

    default:
      return 'Working...';
  }
}

/**
 * Format an error message with category prefix
 *
 * @param {string} category - Error category: "error", "warning", or "info"
 * @param {string} message - Error message
 * @returns {string} - Formatted error message with prefix
 */
function formatErrorMessage(category, message) {
  // Truncate message if too long (leave room for prefix)
  const truncatedMessage = message.length > 1900
    ? message.substring(0, 1900) + '...'
    : message;

  return `**${category}:** ${truncatedMessage}`;
}

module.exports = {
  splitMessage,
  formatToolStatus,
  formatErrorMessage
};
