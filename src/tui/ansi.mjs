// ── NO_COLOR support ────────────────────────────────────────────────────────
export const NO_COLOR = 'NO_COLOR' in process.env || process.env.TERM === 'dumb';

// ── Escape Sequences ────────────────────────────────────────────────────────
export const ESC = '\x1b';
export const ALT_SCREEN_ON = '\x1b[?1049h';
export const ALT_SCREEN_OFF = '\x1b[?1049l';
export const CURSOR_HIDE = '\x1b[?25l';
export const CURSOR_SHOW = '\x1b[?25h';
export const CURSOR_HOME = '\x1b[H';
export const CLEAR_SCREEN = '\x1b[2J';
export const CLEAR_LINE = '\x1b[2K';
export const CLEAR_TO_END = '\x1b[J';

// ── Cursor Movement ────────────────────────────────────────────────────────
/** @param {number} row - 1-based row */
/** @param {number} col - 1-based column */
export function moveTo(row, col) {
  return `\x1b[${row};${col}H`;
}

// ── Color Wrappers ──────────────────────────────────────────────────────────
const wrap = (code) => (s) => NO_COLOR ? s : `\x1b[${code}m${s}\x1b[0m`;

export const bold = wrap(1);
export const dim = wrap(2);
export const inverse = wrap(7);
export const blue = wrap(34);
export const red = wrap(31);
export const green = wrap(32);
export const yellow = wrap(33);
export const magenta = wrap(35);
export const cyan = wrap(36);
export const white = wrap(37);
export const brightBlue = wrap(94);
export const brightRed = wrap(91);
export const brightGreen = wrap(92);
export const brightYellow = wrap(93);
export const brightMagenta = wrap(95);
export const brightCyan = wrap(96);
export const brightWhite = wrap(97);
export const bgBlue = wrap(44);
export const bgMagenta = wrap(45);
export const bgCyan = wrap(46);
export const bgWhite = wrap(47);
export const boldCyan = wrap('1;36');
export const boldBrightCyan = wrap('1;96');
export const highlight = wrap('7;1');

// ── Box Drawing ─────────────────────────────────────────────────────────────
export const BOX = {
  topLeft: '\u250c', topRight: '\u2510', bottomLeft: '\u2514', bottomRight: '\u2518',
  horizontal: '\u2500', vertical: '\u2502', teeRight: '\u251c', teeLeft: '\u2524',
};

// ── Utilities ───────────────────────────────────────────────────────────────
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

/** Strip all ANSI escape sequences from a string. */
export function stripAnsi(str) {
  return str.replace(ANSI_RE, '');
}

/**
 * Compute the display width of a single code point.
 * Variation Selectors (U+FE00–FE0F) are zero-width.
 * Emojis (U+1F300+) and misc symbols (U+2600–27BF) are double-width.
 * CJK Unified Ideographs (U+4E00–9FFF) are double-width.
 * @param {number} cp - Unicode code point
 * @returns {number} 0, 1, or 2
 */
export function charWidth(cp) {
  // Variation Selectors — zero-width
  if (cp >= 0xfe00 && cp <= 0xfe0f) return 0;
  // Emojis (Miscellaneous Symbols and Pictographs, etc.)
  if (cp >= 0x1f300) return 2;
  // Misc symbols & dingbats
  if (cp >= 0x2600 && cp <= 0x27bf) return 2;
  // CJK Unified Ideographs
  if (cp >= 0x4e00 && cp <= 0x9fff) return 2;
  // CJK Compatibility Ideographs
  if (cp >= 0xf900 && cp <= 0xfaff) return 2;
  // Hangul Syllables
  if (cp >= 0xac00 && cp <= 0xd7af) return 2;
  // Fullwidth Forms
  if (cp >= 0xff01 && cp <= 0xff60) return 2;
  // Fullwidth Signs
  if (cp >= 0xffe0 && cp <= 0xffe6) return 2;
  // CJK Extension B
  if (cp >= 0x20000 && cp <= 0x2a6df) return 2;
  // CJK Extension C/D/E
  if (cp >= 0x2a700 && cp <= 0x2ceaf) return 2;
  // CJK Extension F
  if (cp >= 0x2ceb0 && cp <= 0x2ebef) return 2;
  // CJK Extension G
  if (cp >= 0x30000 && cp <= 0x3134f) return 2;
  return 1;
}

/**
 * Visible width accounting for wide chars (emojis, CJK).
 * Emojis and CJK typically occupy 2 terminal columns.
 */
export function visibleLength(str) {
  const stripped = stripAnsi(str);
  let width = 0;
  for (const ch of stripped) {
    width += charWidth(ch.codePointAt(0));
  }
  return width;
}

/** Pad string with spaces to reach `width` visible characters. */
export function padEnd(str, width) {
  const gap = width - visibleLength(str);
  return gap > 0 ? str + ' '.repeat(gap) : str;
}

/**
 * Truncate to `maxWidth` visible chars, appending '…' if truncated. Single-pass.
 * NOTE: When truncation occurs, ANSI formatting is stripped from the truncated result.
 * This is a known limitation — preserving ANSI codes through truncation would require
 * tracking open/close escape sequences, which adds significant complexity.
 * The original string (with ANSI intact) is returned when no truncation is needed.
 */
export function truncate(str, maxWidth) {
  if (maxWidth < 1) return '';
  const stripped = stripAnsi(str);
  let width = 0;
  let result = '';
  for (const ch of stripped) {
    const cw = charWidth(ch.codePointAt(0));
    if (width + cw > maxWidth - 1) return result + '\u2026';
    width += cw;
    result += ch;
  }
  return str; // not truncated, return original with ANSI intact
}

/** Pad ASCII-only string (no ANSI, no wide chars) to `width`. */
export function padEndAscii(str, width) {
  const gap = width - str.length;
  return gap > 0 ? str + ' '.repeat(gap) : str;
}
