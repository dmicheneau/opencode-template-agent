// ─── screen-flush.test.mjs ── Acceptance tests: TUI navigation produces ─────
// clean frames with no duplicate lines.
//
// Validates Bug 1 fix: flush() diff path no longer emits a double CLEAR_LINE.
// Uses the REAL render() + REAL flush() + REAL state machine — no stubs.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, update } from '../src/tui/state.mjs';
import { render } from '../src/tui/renderer.mjs';
import { flush, invalidate } from '../src/tui/screen.mjs';
import { stripAnsi, CLEAR_LINE, SYNC_START, SYNC_END, moveTo } from '../src/tui/ansi.mjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a manifest with enough agents to scroll through. */
function makeManifest() {
  return {
    version: '1.0.0',
    base_path: '.opencode/agents',
    categories: {
      ai: { label: 'AI & Machine Learning', icon: '🤖' },
      web: { label: 'Web Development', icon: '🌐' },
    },
    agents: [
      { name: 'ai-engineer',  category: 'ai',  path: 'ai/ai-engineer',  mode: 'subagent', description: 'AI systems',   tags: ['ai'] },
      { name: 'ml-engineer',  category: 'ai',  path: 'ai/ml-engineer',  mode: 'subagent', description: 'ML pipelines', tags: ['ml'] },
      { name: 'react-dev',    category: 'web', path: 'web/react-dev',   mode: 'subagent', description: 'React apps',   tags: ['react'] },
      { name: 'vue-expert',   category: 'web', path: 'web/vue-expert',  mode: 'subagent', description: 'Vue 3 apps',   tags: ['vue'] },
      { name: 'nextjs-pro',   category: 'web', path: 'web/nextjs-pro',  mode: 'subagent', description: 'Next.js',      tags: ['next'] },
    ],
    packs: {
      frontend: { label: 'Frontend', description: 'Frontend agents', agents: ['react-dev', 'vue-expert'] },
    },
  };
}

const TERMINAL = { cols: 100, rows: 30 };

/**
 * Capture everything flush() writes to process.stdout.
 * Returns the raw output string.
 */
function captureFlush(buffer) {
  let captured = '';
  const orig = process.stdout.write;
  process.stdout.write = (data) => { captured += data; return true; };
  try {
    flush(buffer);
  } finally {
    process.stdout.write = orig;
  }
  return captured;
}

/** Count occurrences of a substring. */
function countOccurrences(str, sub) {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Acceptance: TUI navigation produces clean frames (Bug 1 fix)', () => {

  beforeEach(() => {
    // Reset flush()'s internal prevLines so each test starts fresh
    invalidate();
  });

  it('navigating DOWN then UP: each line appears exactly once, no duplication', () => {
    const state0 = createInitialState(makeManifest(), TERMINAL);
    const frame0 = render(state0);

    // Move cursor down
    const state1 = update(state0, { action: 'DOWN' });
    const frame1 = render(state1);

    // Move cursor back up
    const state2 = update(state1, { action: 'UP' });
    const frame2 = render(state2);

    // All frames should have the same line count (same terminal size, same mode)
    const lines0 = frame0.split('\n');
    const lines1 = frame1.split('\n');
    const lines2 = frame2.split('\n');

    assert.equal(lines0.length, lines1.length,
      'DOWN should not change frame line count');
    assert.equal(lines1.length, lines2.length,
      'UP should not change frame line count');

    // Check visible content: no line appears twice
    const visible2 = lines2.map(l => stripAnsi(l));
    const unique = new Set(visible2);
    // Blank/padding lines may repeat legitimately, but content lines must be unique
    const contentLines = visible2.filter(l => l.trim().length > 0);
    const contentSet = new Set(contentLines);
    // The same padding row (e.g. "│    ...    │") can repeat, so we check
    // that non-trivial lines (with agent names) don't duplicate
    const agentLines = contentLines.filter(l => /ai-engineer|ml-engineer|react-dev|vue-expert|nextjs-pro/.test(l));
    const agentSet = new Set(agentLines);
    assert.equal(agentLines.length, agentSet.size,
      'Agent rows should not be duplicated in the frame');
  });

  it('flush diff path: changed lines carry exactly one CLEAR_LINE each', () => {
    const state0 = createInitialState(makeManifest(), TERMINAL);
    const frame0 = render(state0);

    // First flush — full redraw (prevLines is empty)
    captureFlush(frame0);

    // Move cursor down to change some lines
    const state1 = update(state0, { action: 'DOWN' });
    const frame1 = render(state1);

    // Second flush — diff path (same line count)
    const output = captureFlush(frame1);

    // Strip sync markers
    const diffPart = output.slice(SYNC_START.length, -SYNC_END.length);

    // Count changed lines: compare frame0 vs frame1 line-by-line
    const lines0 = frame0.split('\n');
    const lines1 = frame1.split('\n');
    let changedCount = 0;
    for (let i = 0; i < lines0.length; i++) {
      if (lines0[i] !== lines1[i]) changedCount++;
    }

    // Each changed line from the renderer already embeds 1 CLEAR_LINE.
    // The flush diff path should NOT add extras — total should be exactly changedCount.
    const clearCount = countOccurrences(diffPart, CLEAR_LINE);
    assert.equal(clearCount, changedCount,
      `Expected ${changedCount} CLEAR_LINE (one per changed line from renderer), got ${clearCount}. ` +
      'Double CLEAR_LINE bug is present if clearCount > changedCount.');
  });

  it('rapid DOWN-DOWN-UP-UP cycle produces no residual content', () => {
    let state = createInitialState(makeManifest(), TERMINAL);

    // Render + flush initial frame
    captureFlush(render(state));

    // Navigate: DOWN, DOWN, UP, UP — back to original position
    for (const action of ['DOWN', 'DOWN', 'UP', 'UP']) {
      state = update(state, { action });
      captureFlush(render(state));
    }

    // The cursor should be back to row 0
    assert.equal(state.list.cursor, 0,
      'Cursor should return to original position after symmetric DOWN/UP');

    // Render the final frame and check it matches the initial one
    const initialState = createInitialState(makeManifest(), TERMINAL);
    const initialFrame = render(initialState);
    const finalFrame = render(state);

    // Visible content should be identical (cursor at same position = same frame)
    const initialVisible = initialFrame.split('\n').map(l => stripAnsi(l));
    const finalVisible = finalFrame.split('\n').map(l => stripAnsi(l));
    assert.deepEqual(finalVisible, initialVisible,
      'Frame after symmetric DOWN/UP cycle should match initial frame');
  });

  it('flush emits no diff output when frame is unchanged', () => {
    const state = createInitialState(makeManifest(), TERMINAL);
    const frame = render(state);

    // First flush — full redraw
    captureFlush(frame);

    // Second flush with identical frame — diff path
    const output = captureFlush(frame);
    const diffPart = output.slice(SYNC_START.length, -SYNC_END.length);

    assert.equal(diffPart, '',
      'Identical frames should produce zero diff output');
  });

  it('full redraw path when line count changes (terminal resize scenario)', () => {
    const state0 = createInitialState(makeManifest(), TERMINAL);
    const frame0 = render(state0);

    // First flush — full redraw
    captureFlush(frame0);

    // Simulate terminal resize: fewer rows = different line count
    const smallerTerminal = { cols: 100, rows: 20 };
    const stateSmall = createInitialState(makeManifest(), smallerTerminal);
    const frameSmall = render(stateSmall);

    const output = captureFlush(frameSmall);

    // Full redraw should use CURSOR_HOME, not individual moveTo() calls
    assert.ok(output.includes('\x1b[H'),
      'Line count change should trigger full redraw with CURSOR_HOME');
    assert.ok(output.includes('\x1b[J'),
      'Full redraw should clear to end of screen');
  });

  it('renderer lines all start with CLEAR_LINE (contract for flush diff)', () => {
    const state = createInitialState(makeManifest(), TERMINAL);
    const frame = render(state);
    const lines = frame.split('\n');

    for (let i = 0; i < lines.length; i++) {
      assert.ok(lines[i].startsWith(CLEAR_LINE),
        `Line ${i} should start with CLEAR_LINE. Got: ${JSON.stringify(lines[i].slice(0, 20))}`);
    }
  });
});
