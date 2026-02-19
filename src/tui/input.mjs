// ─── input.mjs ── Keystroke parser for raw-mode TUI ─────────────────────────
// Zero deps, standalone module. Converts stdin bytes into semantic actions.

/** @enum {string} */
export const Action = Object.freeze({
  // Navigation
  UP:          'UP',
  DOWN:        'DOWN',
  LEFT:        'LEFT',
  RIGHT:       'RIGHT',
  PAGE_UP:     'PAGE_UP',
  PAGE_DOWN:   'PAGE_DOWN',
  HOME:        'HOME',
  END:         'END',

  // Tab navigation
  TAB:         'TAB',
  SHIFT_TAB:   'SHIFT_TAB',

  // Actions
  SELECT:      'SELECT',
  CONFIRM:     'CONFIRM',
  SEARCH:      'SEARCH',
  ESCAPE:      'ESCAPE',
  QUIT:        'QUIT',
  SELECT_ALL:  'SELECT_ALL',
  // Editing
  BACKSPACE:   'BACKSPACE',
  DELETE_WORD: 'DELETE_WORD',

  // Character input (search mode)
  CHAR:        'CHAR',

  // Confirm mode
  YES:         'YES',
  NO:          'NO',

  // Done mode
  FORCE:       'FORCE',

  // Uninstall
  UNINSTALL:   'UNINSTALL',

  // Fallback
  NONE:        'NONE',
});

// ─── Escape Sequence Map ────────────────────────────────────────────────────

const SEQUENCES = {
  '\x1b[A':  Action.UP,
  '\x1b[B':  Action.DOWN,
  '\x1b[C':  Action.RIGHT,
  '\x1b[D':  Action.LEFT,
  '\x1b[Z':  Action.SHIFT_TAB,
  '\x1b[5~': Action.PAGE_UP,
  '\x1b[6~': Action.PAGE_DOWN,
  '\x1b[H':  Action.HOME,
  '\x1b[F':  Action.END,
  '\x1bOH':  Action.HOME,
  '\x1bOF':  Action.END,
  '\x1b[1~': Action.HOME,
  '\x1b[4~': Action.END,
};

// ─── Single-byte Constants ──────────────────────────────────────────────────

const CTRL_C      = '\x03';
const TAB         = '\x09';
const ENTER       = '\r';
const LF          = '\n';
const SPACE       = ' ';
const ESC         = '\x1b';
const BACKSPACE_1 = '\x7f';
const BACKSPACE_2 = '\x08';
const CTRL_W      = '\x17';

// ─── Result helpers (avoid allocation per-call for common returns) ──────────

const R_QUIT       = Object.freeze({ action: Action.QUIT });
const R_ESCAPE     = Object.freeze({ action: Action.ESCAPE });
const R_TAB        = Object.freeze({ action: Action.TAB });
const R_CONFIRM    = Object.freeze({ action: Action.CONFIRM });
const R_BACKSPACE  = Object.freeze({ action: Action.BACKSPACE });
const R_DELETE_W   = Object.freeze({ action: Action.DELETE_WORD });
const R_SELECT     = Object.freeze({ action: Action.SELECT });
const R_SEARCH     = Object.freeze({ action: Action.SEARCH });
const R_SELECT_ALL = Object.freeze({ action: Action.SELECT_ALL });
const R_YES        = Object.freeze({ action: Action.YES });
const R_NO         = Object.freeze({ action: Action.NO });
const R_FORCE      = Object.freeze({ action: Action.FORCE });
const R_UNINSTALL  = Object.freeze({ action: Action.UNINSTALL });
const R_NONE       = Object.freeze({ action: Action.NONE });

// Pre-allocated results for frequent ANSI escape sequences (avoid allocation per keypress)
const SEQ_RESULTS = Object.freeze(
  Object.fromEntries(
    Object.entries(SEQUENCES).map(([seq, action]) => [seq, Object.freeze({ action })])
  )
);

/**
 * @typedef {{ action: string, char?: string }} ParsedKey
 */

/**
 * Parse raw stdin data into a semantic action.
 * @param {Buffer} data  - Raw bytes from stdin
 * @param {string} mode  - Current TUI mode ('browse' | 'search' | 'confirm' | 'pack_detail')
 * @returns {ParsedKey}
 */
export function parseKey(data, mode) {
  if (!data || data.length === 0) return R_NONE;

  const raw = typeof data === 'string' ? data : data.toString('utf8');
  if (raw.length === 0) return R_NONE;

  // ── Ctrl+C — always quit immediately ──────────────────────────────────
  if (raw === CTRL_C) return R_QUIT;

  // ── Multi-char escape sequences (arrow keys, page up/down, etc.) ──────
  if (raw.length > 1 && raw[0] === ESC) {
    return SEQ_RESULTS[raw] || R_NONE;
  }

  // ── Single ESC (not part of a sequence) ───────────────────────────────
  if (raw === ESC) return R_ESCAPE;

  // ── Ctrl+W ────────────────────────────────────────────────────────────
  if (raw === CTRL_W) return R_DELETE_W;

  // ── Backspace ─────────────────────────────────────────────────────────
  if (raw === BACKSPACE_1 || raw === BACKSPACE_2) return R_BACKSPACE;

  // ── Tab ───────────────────────────────────────────────────────────────
  if (raw === TAB) return R_TAB;

  // ── Enter ─────────────────────────────────────────────────────────────
  if (raw === ENTER || raw === LF) return R_CONFIRM;

  // ── Context-dependent mapping ─────────────────────────────────────────

  if (mode === 'search') {
    // In search mode, any printable character is CHAR input
    if (raw.length === 1 && raw.charCodeAt(0) >= 32) {
      return { action: Action.CHAR, char: raw };
    }
    return R_NONE;
  }

  if (mode === 'confirm' || mode === 'uninstall_confirm') {
    if (raw === 'y' || raw === 'Y' || raw === 'o' || raw === 'O') return R_YES;
    if (raw === 'n' || raw === 'N') return R_NO;
    return R_NONE;
  }

  // ── Browse / pack_detail mode ─────────────────────────────────────────
  if (mode === 'done') {
    if (raw === SPACE) return R_SELECT;
    if (raw === 'f' || raw === 'F') return R_FORCE;
    if (raw === 'q' || raw === 'Q') return R_QUIT;
    if (raw === ENTER) return R_CONFIRM;
    return R_NONE;                     // ignore unknown keys
  }

  if (raw === SPACE) return R_SELECT;
  if (raw === '/')   return R_SEARCH;
  if (raw === 'q' || raw === 'Q') return R_QUIT;
  if (raw === 'a' || raw === 'A') return R_SELECT_ALL;
  if (raw === 'x' || raw === 'X') return R_UNINSTALL;

  return R_NONE;
}
