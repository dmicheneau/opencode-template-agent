// ─── screen.mjs ─────────────────────────────────────────────────────────────
// Terminal Control Layer — exclusive I/O module for the TUI.
// Only module allowed to interact with process.stdin / process.stdout.
// Zero npm deps, Node 20+ ESM.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ALT_SCREEN_ON,
  ALT_SCREEN_OFF,
  CURSOR_HIDE,
  CURSOR_SHOW,
  CURSOR_HOME,
  CLEAR_SCREEN,
} from './ansi.mjs';

// ─── Internal State ─────────────────────────────────────────────────────────

/** Guard to make exit() idempotent. */
let active = false;

/** Saved stdin encoding to restore on exit. */
let savedEncoding = null;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Enter TUI mode: alternate screen, raw mode, hide cursor.
 * MUST be called before any rendering.
 * @throws {Error} If stdin is not a TTY.
 */
export function enter() {
  if (process.stdin.isTTY !== true) {
    throw new Error(
      'screen.enter() requires a TTY on stdin. ' +
        'Are you piping input or running in a non-interactive shell?',
    );
  }

  process.stdin.setRawMode(true);
  process.stdin.resume();
  savedEncoding = process.stdin.readableEncoding;
  process.stdin.setEncoding('utf-8');
  process.stdout.write(ALT_SCREEN_ON + CURSOR_HIDE + CLEAR_SCREEN + CURSOR_HOME);

  active = true;
}

/**
 * Exit TUI mode: restore main screen, cooked mode, show cursor.
 * Safe to call multiple times (idempotent).
 */
export function exit() {
  if (!active) return;
  active = false;

  process.stdout.write(CURSOR_SHOW + ALT_SCREEN_OFF);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  if (savedEncoding !== null) {
    process.stdin.setEncoding(savedEncoding || 'utf-8');
    savedEncoding = null;
  }
  process.stdin.pause();
}

/**
 * Write a complete frame buffer to stdout in a single operation.
 * Moves cursor to home first — does NOT clear screen (anti-flickering).
 * @param {string} buffer - Complete frame content.
 */
export function flush(buffer) {
  process.stdout.write(CURSOR_HOME + buffer);
}

/**
 * Get current terminal dimensions.
 * @returns {{ cols: number, rows: number }}
 */
export function getSize() {
  return {
    cols: process.stdout.columns,
    rows: process.stdout.rows,
  };
}

/**
 * Register a resize handler. Returns an unsubscribe function.
 * The callback receives the new terminal size.
 * @param {(size: { cols: number, rows: number }) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onResize(callback) {
  const handler = () => callback(getSize());
  process.stdout.on('resize', handler);
  return () => process.stdout.off('resize', handler);
}

/**
 * Register a stdin data handler. Returns an unsubscribe function.
 * @param {(data: string) => void} callback
 * @returns {() => void} Unsubscribe function.
 */
export function onInput(callback) {
  process.stdin.on('data', callback);
  return () => process.stdin.off('data', callback);
}
