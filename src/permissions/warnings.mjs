// ── Permission Warning System ────────────────────────────────────────────────
// 4-level warning display for permission changes (V7.0).
// Zero dependencies — uses ANSI utilities from src/tui/ansi.mjs.

import { createInterface } from 'node:readline';
import {
  NO_COLOR,
  bold,
  red,
  yellow,
  cyan,
  white,
  stripAnsi,
  visibleLength,
  BOX,
} from '../tui/ansi.mjs';

// ── Warning Levels ───────────────────────────────────────────────────────────

/** @enum {string} */
export const WarningLevel = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  INFO: 'info',
});

// ── ANSI helpers not exposed by ansi.mjs ─────────────────────────────────────

/** Bold white text on red background — for CRITICAL level. */
const bgRedWhiteBold = NO_COLOR
  ? (/** @type {string} */ s) => s
  : (/** @type {string} */ s) => `\x1b[1;37;41m${s}\x1b[0m`;

// ── Color mapping per level ──────────────────────────────────────────────────

/**
 * @type {Record<string, (s: string) => string>}
 */
const LEVEL_STYLE = {
  [WarningLevel.CRITICAL]: bgRedWhiteBold,
  [WarningLevel.HIGH]: (/** @type {string} */ s) => bold(red(s)),
  [WarningLevel.MEDIUM]: yellow,
  [WarningLevel.INFO]: cyan,
};

/** Icon per level. */
const LEVEL_ICON = {
  [WarningLevel.CRITICAL]: '⚠',
  [WarningLevel.HIGH]: '⚠',
  [WarningLevel.MEDIUM]: '⚠',
  [WarningLevel.INFO]: 'ℹ',
};

// ── Private: word-wrap ───────────────────────────────────────────────────────

/**
 * Word-wrap a string to fit within `maxWidth` visible characters.
 * Splits on spaces; words longer than `maxWidth` are force-broken.
 *
 * @param {string} text
 * @param {number} maxWidth
 * @returns {string[]} wrapped lines
 */
function wordWrap(text, maxWidth) {
  if (maxWidth < 1) return [text];

  /** @type {string[]} */
  const lines = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let current = '';

    for (const word of words) {
      if (!word) continue;

      if (current.length === 0) {
        // Force-break words longer than maxWidth
        if (word.length > maxWidth) {
          for (let i = 0; i < word.length; i += maxWidth) {
            lines.push(word.slice(i, i + maxWidth));
          }
        } else {
          current = word;
        }
      } else if (current.length + 1 + word.length > maxWidth) {
        lines.push(current);
        if (word.length > maxWidth) {
          for (let i = 0; i < word.length; i += maxWidth) {
            lines.push(word.slice(i, i + maxWidth));
          }
          current = '';
        } else {
          current = word;
        }
      } else {
        current += ' ' + word;
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [''];
}

// ── displayWarning ───────────────────────────────────────────────────────────

/**
 * Display a bordered warning box to the given stream.
 *
 * ```
 * ┌─ ⚠ CRITICAL ────────────────────────┐
 * │ Title text here                       │
 * │                                       │
 * │ Message body that can be              │
 * │ multiple lines wrapped at ~60 chars   │
 * └───────────────────────────────────────┘
 * ```
 *
 * @param {string} level   - One of WarningLevel values
 * @param {string} title   - Short title line
 * @param {string} message - Body text (may be multi-line)
 * @param {NodeJS.WritableStream} [stream=process.stderr] - Output stream
 */
export function displayWarning(level, title, message, stream = process.stderr) {
  const style = LEVEL_STYLE[level] ?? cyan;
  const icon = LEVEL_ICON[level] ?? 'ℹ';
  const label = level.toUpperCase();

  // Box width: 60 or terminal width - 4, whichever is smaller
  const termWidth = /** @type {any} */ (stream).columns
    ?? process.stderr.columns
    ?? process.stdout.columns
    ?? 80;
  const boxWidth = Math.min(60, termWidth - 4);
  const innerWidth = boxWidth - 4; // "│ " + content + " │"

  // ── Top border: ┌─ ⚠ LEVEL ─────────┐
  const badgeText = ` ${icon} ${label} `;
  const styledBadge = style(badgeText);
  const badgeVisLen = visibleLength(styledBadge);
  // "┌─" prefix = 2 chars, badge, then fill, "┐" suffix = 1 char
  const topFill = Math.max(0, boxWidth - 2 - badgeVisLen - 1);
  const topLine = `${BOX.topLeft}${BOX.horizontal}${styledBadge}${BOX.horizontal.repeat(topFill)}${BOX.topRight}`;

  // ── Bottom border
  const bottomLine = `${BOX.bottomLeft}${BOX.horizontal.repeat(boxWidth - 2)}${BOX.bottomRight}`;

  // ── Content lines
  const padLine = (/** @type {string} */ text) => {
    const vis = visibleLength(text);
    const gap = Math.max(0, innerWidth - vis);
    return `${BOX.vertical} ${text}${' '.repeat(gap)} ${BOX.vertical}`;
  };

  const emptyLine = padLine('');

  // Title line(s) — styled
  const titleLines = wordWrap(title, innerWidth).map((l) => padLine(style(l)));

  // Message lines — plain
  const msgLines = wordWrap(message, innerWidth).map(padLine);

  // ── Write
  const out = [
    '',
    topLine,
    ...titleLines,
    emptyLine,
    ...msgLines,
    bottomLine,
    '',
  ];

  for (const line of out) {
    stream.write(line + '\n');
  }
}

// ── requireConfirmation ──────────────────────────────────────────────────────

/**
 * Prompt the user for confirmation by reading a line from stdin.
 * Returns `true` only if the input matches `expectedInput` exactly.
 *
 * @param {string} prompt         - Text to display before waiting for input
 * @param {string} [expectedInput='CONFIRM'] - Exact string the user must type
 * @returns {Promise<boolean>} `true` if user typed the expected input
 */
export async function requireConfirmation(prompt, expectedInput = 'CONFIRM') {
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() === expectedInput);
    });
  });
}

// ── getWarningsForPreset ─────────────────────────────────────────────────────

/** @type {Record<string, Array<{level: string, title: string, message: string}>>} */
const PRESET_WARNINGS = {
  yolo: [
    {
      level: WarningLevel.CRITICAL,
      title: 'Unrestricted access enabled',
      message:
        'All permissions set to allow. The agent will have unrestricted access to your filesystem, network, and tools.',
    },
  ],
  permissive: [
    {
      level: WarningLevel.HIGH,
      title: 'Broad access enabled',
      message: 'Most permissions set to allow. The agent has broad access.',
    },
  ],
  balanced: [
    {
      level: WarningLevel.INFO,
      title: 'Balanced defaults',
      message: 'Using balanced defaults. Bash commands require approval.',
    },
  ],
  strict: [
    {
      level: WarningLevel.INFO,
      title: 'Strict mode',
      message: 'Strict mode. Most write operations are denied.',
    },
  ],
};

/**
 * Get the warnings associated with a given preset name.
 *
 * @param {string} presetName
 * @returns {Array<{level: string, title: string, message: string}>}
 */
export function getWarningsForPreset(presetName) {
  return PRESET_WARNINGS[presetName] ?? [];
}

// ── getWarningsForPermission ─────────────────────────────────────────────────

/**
 * @type {Record<string, Record<string, {level: string, title: string, message: string}>>}
 * Keyed by permission name → action → warning.
 */
const PERMISSION_WARNINGS = {
  bash: {
    allow: {
      level: WarningLevel.MEDIUM,
      title: 'Unrestricted bash access',
      message: 'Unrestricted bash access allows arbitrary command execution.',
    },
  },
  write: {
    allow: {
      level: WarningLevel.MEDIUM,
      title: 'Unrestricted write access',
      message: 'Write permission allows creating new files anywhere.',
    },
  },
  mcp: {
    allow: {
      level: WarningLevel.MEDIUM,
      title: 'MCP access enabled',
      message: 'MCP access allows interaction with external services.',
    },
  },
  browsermcp: {
    allow: {
      level: WarningLevel.MEDIUM,
      title: 'Browser access enabled',
      message: 'Browser access allows automated web interaction.',
    },
  },
};

/**
 * Get warnings for a specific permission + action combination.
 *
 * @param {string} permName - Permission name (e.g. `'bash'`, `'write'`)
 * @param {string} action   - Action value (e.g. `'allow'`, `'deny'`)
 * @returns {Array<{level: string, title: string, message: string}>}
 */
export function getWarningsForPermission(permName, action) {
  const entry = PERMISSION_WARNINGS[permName]?.[action];
  return entry ? [entry] : [];
}
