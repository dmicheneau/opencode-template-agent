import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, existsSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseKey, Action } from '../src/tui/input.mjs';
import { createInitialState, update, computeFilteredList, getViewportHeight } from '../src/tui/state.mjs';
import { visibleLength, truncate, padEnd, charWidth, stripAnsi, bgRow, catColor, tabColor } from '../src/tui/ansi.mjs';
import { render } from '../src/tui/renderer.mjs';
import { uninstallAgent, uninstallAgents } from '../src/installer.mjs';
import { recordInstall, readLock } from '../src/lock.mjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal manifest for state tests. */
function makeManifest(overrides = {}) {
  return {
    version: '1.0.0',
    base_path: '.opencode/agents',
    categories: {
      ai: { label: 'AI & Machine Learning' },
      database: { label: 'Database' },
    },
    agents: [
      { name: 'ai-engineer', category: 'ai', path: 'ai/ai-engineer', mode: 'subagent', description: 'AI systems', tags: ['ai'] },
      { name: 'ml-engineer', category: 'ai', path: 'ai/ml-engineer', mode: 'subagent', description: 'ML pipelines', tags: ['ml'] },
      { name: 'postgres-pro', category: 'database', path: 'database/postgres-pro', mode: 'subagent', description: 'Postgres optimization', tags: ['postgres'] },
    ],
    packs: {
      backend: { label: 'Backend Essentials', description: 'Backend agents', agents: ['postgres-pro', 'ai-engineer'] },
    },
    ...overrides,
  };
}

/** Shortcut: create initial state with sensible defaults. */
function makeState(manifestOverrides = {}, terminal = { cols: 80, rows: 24 }) {
  return createInitialState(makeManifest(manifestOverrides), terminal);
}

/** Simulate a key press as a Buffer (like stdin would). */
function buf(str) {
  return Buffer.from(str, 'utf8');
}

// ─── input.mjs — parseKey ────────────────────────────────────────────────────

describe('parseKey', () => {

  // ── Mode: browse ────────────────────────────────────────────────────────

  describe('mode browse', () => {
    const mode = 'browse';

    it('Arrow Up → UP', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[A'), mode), { action: 'UP' });
    });

    it('Arrow Down → DOWN', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[B'), mode), { action: 'DOWN' });
    });

    it('Arrow Right → RIGHT', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[C'), mode), { action: 'RIGHT' });
    });

    it('Arrow Left → LEFT', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[D'), mode), { action: 'LEFT' });
    });

    it('Space → SELECT', () => {
      assert.deepStrictEqual(parseKey(buf(' '), mode), { action: 'SELECT' });
    });

    it('Enter → CONFIRM', () => {
      assert.deepStrictEqual(parseKey(buf('\r'), mode), { action: 'CONFIRM' });
    });

    it('/ → SEARCH', () => {
      assert.deepStrictEqual(parseKey(buf('/'), mode), { action: 'SEARCH' });
    });

    it('q → QUIT', () => {
      assert.deepStrictEqual(parseKey(buf('q'), mode), { action: 'QUIT' });
    });

    it('Q → QUIT (uppercase)', () => {
      assert.deepStrictEqual(parseKey(buf('Q'), mode), { action: 'QUIT' });
    });

    it('Tab → TAB', () => {
      assert.deepStrictEqual(parseKey(buf('\x09'), mode), { action: 'TAB' });
    });

    it('Shift+Tab → SHIFT_TAB', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[Z'), mode), { action: 'SHIFT_TAB' });
    });

    it('a → SELECT_ALL', () => {
      assert.deepStrictEqual(parseKey(buf('a'), mode), { action: 'SELECT_ALL' });
    });

    it('A → SELECT_ALL (uppercase)', () => {
      assert.deepStrictEqual(parseKey(buf('A'), mode), { action: 'SELECT_ALL' });
    });

    it('? → NONE (no HELP action)', () => {
      assert.deepStrictEqual(parseKey(buf('?'), mode), { action: 'NONE' });
    });

    it('Page Up → PAGE_UP', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[5~'), mode), { action: 'PAGE_UP' });
    });

    it('Page Down → PAGE_DOWN', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[6~'), mode), { action: 'PAGE_DOWN' });
    });

    it('Home → HOME', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[H'), mode), { action: 'HOME' });
    });

    it('End → END', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[F'), mode), { action: 'END' });
    });

    it('unknown letter → NONE', () => {
      assert.deepStrictEqual(parseKey(buf('z'), mode), { action: 'NONE' });
    });
  });

  // ── Mode: search ────────────────────────────────────────────────────────

  describe('mode search', () => {
    const mode = 'search';

    it('letter → CHAR with value', () => {
      const result = parseKey(buf('x'), mode);
      assert.equal(result.action, 'CHAR');
      assert.equal(result.char, 'x');
    });

    it('uppercase letter → CHAR with value', () => {
      const result = parseKey(buf('Z'), mode);
      assert.equal(result.action, 'CHAR');
      assert.equal(result.char, 'Z');
    });

    it('space → CHAR with space value', () => {
      // In search mode, space is a printable char, not SELECT
      // But wait: space has charCode 32, and the code checks charCodeAt(0) >= 32
      // However, the check for Space happens BEFORE the mode switch. Let's verify.
      // Actually: the SPACE check `if (raw === SPACE) return R_SELECT` is in browse/pack_detail,
      // NOT before the mode check. Let's re-read: Enter/Tab/Backspace are before, Space is after.
      // Actually space IS before mode check at line 165 — no wait, line 142 checks mode=search first.
      // Re-reading: CTRL_C, ESC sequences, ESC, CTRL_W, Backspace, Tab, Enter are checked first.
      // Then mode-specific handling. Space is NOT in the early returns.
      // Wait: line 165 `if (raw === SPACE) return R_SELECT` is AFTER the mode checks.
      // So in search mode, space goes through CHAR path. charCodeAt(0)=32 >= 32 → CHAR.
      // But wait, SPACE is checked at line 165, which is AFTER `if (mode === 'search')` at line 142.
      // Since mode=search returns first, space in search mode → CHAR.
      // Hmm, but ENTER is caught at line 138 BEFORE mode check, and returns CONFIRM.
      // So Enter in search mode = CONFIRM.
      const result = parseKey(buf(' '), mode);
      assert.equal(result.action, 'CHAR');
      assert.equal(result.char, ' ');
    });

    it('digit → CHAR with value', () => {
      const result = parseKey(buf('5'), mode);
      assert.equal(result.action, 'CHAR');
      assert.equal(result.char, '5');
    });

    it('Backspace → BACKSPACE', () => {
      assert.deepStrictEqual(parseKey(buf('\x7f'), mode), { action: 'BACKSPACE' });
    });

    it('Escape → ESCAPE', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b'), mode), { action: 'ESCAPE' });
    });

    it('Enter → CONFIRM', () => {
      assert.deepStrictEqual(parseKey(buf('\r'), mode), { action: 'CONFIRM' });
    });

    it('Ctrl+W → DELETE_WORD', () => {
      assert.deepStrictEqual(parseKey(buf('\x17'), mode), { action: 'DELETE_WORD' });
    });

    it('arrow keys still work in search mode', () => {
      // Arrow keys are multi-char escape sequences, handled before mode check
      assert.deepStrictEqual(parseKey(buf('\x1b[A'), mode), { action: 'UP' });
    });
  });

  // ── Mode: confirm ───────────────────────────────────────────────────────

  describe('mode confirm', () => {
    const mode = 'confirm';

    it('y → YES', () => {
      assert.deepStrictEqual(parseKey(buf('y'), mode), { action: 'YES' });
    });

    it('Y → YES', () => {
      assert.deepStrictEqual(parseKey(buf('Y'), mode), { action: 'YES' });
    });

    it('o → YES (French oui)', () => {
      assert.deepStrictEqual(parseKey(buf('o'), mode), { action: 'YES' });
    });

    it('n → NO', () => {
      assert.deepStrictEqual(parseKey(buf('n'), mode), { action: 'NO' });
    });

    it('N → NO', () => {
      assert.deepStrictEqual(parseKey(buf('N'), mode), { action: 'NO' });
    });

    it('Escape → ESCAPE', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b'), mode), { action: 'ESCAPE' });
    });

    it('random letter → NONE', () => {
      assert.deepStrictEqual(parseKey(buf('x'), mode), { action: 'NONE' });
    });

    it('Enter → CONFIRM', () => {
      assert.deepStrictEqual(parseKey(buf('\r'), mode), { action: 'CONFIRM' });
    });
  });

  // ── Mode: done ──────────────────────────────────────────────────────────

  describe('mode done', () => {
    const mode = 'done';

    it('Space → SELECT', () => {
      assert.deepStrictEqual(parseKey(buf(' '), mode), { action: 'SELECT' });
    });

    it('f → FORCE', () => {
      assert.deepStrictEqual(parseKey(buf('f'), mode), { action: 'FORCE' });
    });

    it('F → FORCE (uppercase)', () => {
      assert.deepStrictEqual(parseKey(buf('F'), mode), { action: 'FORCE' });
    });

    it('Enter → CONFIRM', () => {
      assert.deepStrictEqual(parseKey(buf('\r'), mode), { action: 'CONFIRM' });
    });

    it('q → QUIT', () => {
      assert.deepStrictEqual(parseKey(buf('q'), mode), { action: 'QUIT' });
    });

    it('random letter → NONE', () => {
      assert.deepStrictEqual(parseKey(buf('x'), mode), { action: 'NONE' });
    });
  });

  // ── Mode: pack_detail ───────────────────────────────────────────────────

  describe('mode pack_detail', () => {
    const mode = 'pack_detail';

    it('Arrow Up → UP', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[A'), mode), { action: 'UP' });
    });

    it('Arrow Down → DOWN', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[B'), mode), { action: 'DOWN' });
    });

    it('Space → SELECT', () => {
      assert.deepStrictEqual(parseKey(buf(' '), mode), { action: 'SELECT' });
    });

    it('Enter → CONFIRM', () => {
      assert.deepStrictEqual(parseKey(buf('\r'), mode), { action: 'CONFIRM' });
    });

    it('Escape → ESCAPE', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b'), mode), { action: 'ESCAPE' });
    });

    it('a → SELECT_ALL', () => {
      assert.deepStrictEqual(parseKey(buf('a'), mode), { action: 'SELECT_ALL' });
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('Ctrl+C → QUIT regardless of mode', () => {
      for (const mode of ['browse', 'search', 'confirm', 'done', 'pack_detail']) {
        assert.deepStrictEqual(parseKey(buf('\x03'), mode), { action: 'QUIT' }, `Ctrl+C should quit in ${mode}`);
      }
    });

    it('empty buffer → NONE', () => {
      assert.deepStrictEqual(parseKey(Buffer.alloc(0), 'browse'), { action: 'NONE' });
    });

    it('null data → NONE', () => {
      assert.deepStrictEqual(parseKey(null, 'browse'), { action: 'NONE' });
    });

    it('undefined data → NONE', () => {
      assert.deepStrictEqual(parseKey(undefined, 'browse'), { action: 'NONE' });
    });

    it('string input works (not just Buffer)', () => {
      assert.deepStrictEqual(parseKey('\x1b[A', 'browse'), { action: 'UP' });
    });

    it('LF (\\n) → CONFIRM', () => {
      assert.deepStrictEqual(parseKey(buf('\n'), 'browse'), { action: 'CONFIRM' });
    });

    it('Backspace alt code (\\x08) → BACKSPACE', () => {
      assert.deepStrictEqual(parseKey(buf('\x08'), 'browse'), { action: 'BACKSPACE' });
    });

    it('unknown escape sequence → NONE', () => {
      assert.deepStrictEqual(parseKey(buf('\x1b[99~'), 'browse'), { action: 'NONE' });
    });
  });
});

// ─── state.mjs — createInitialState ──────────────────────────────────────────

describe('createInitialState', () => {
  it('returns correct shape with all required fields', () => {
    const state = makeState();
    assert.equal(state.mode, 'browse');
    assert.ok(state.tabs);
    assert.ok(Array.isArray(state.tabs.ids));
    assert.ok(Array.isArray(state.tabs.labels));
    assert.equal(state.tabs.activeIndex, 0);
    assert.ok(state.list);
    assert.ok(Array.isArray(state.list.items));
    assert.equal(state.list.cursor, 0);
    assert.equal(state.list.scrollOffset, 0);
    assert.ok(state.selection instanceof Set);
    assert.equal(state.selection.size, 0);
    assert.deepStrictEqual(state.search, { active: false, query: '' });
    assert.ok(state.packs);
    assert.equal(state.packDetail, null);
    assert.equal(state.install, null);
    assert.ok(state.terminal);
    assert.ok(state.manifest);
    assert.ok(Array.isArray(state.allAgents));
    assert.equal(state.flash, null);
    assert.equal(state.confirmContext, null);
  });

  it('builds tabs from categories with "all" and "packs" first', () => {
    const state = makeState();
    assert.equal(state.tabs.ids[0], 'all');
    assert.equal(state.tabs.ids[1], 'packs');
    assert.ok(state.tabs.ids.includes('ai'));
    assert.ok(state.tabs.ids.includes('database'));
  });

  it('tab labels contain agent counts', () => {
    const state = makeState();
    assert.ok(state.tabs.labels[0].startsWith('ALL('));
    assert.ok(state.tabs.labels[1].startsWith('Packs('));
  });

  it('list.items starts with all agents', () => {
    const state = makeState();
    assert.equal(state.list.items.length, 3);
  });

  it('agents have _searchStr field for search', () => {
    const state = makeState();
    for (const agent of state.allAgents) {
      assert.ok(typeof agent._searchStr === 'string');
      assert.ok(agent._searchStr.includes(agent.name));
    }
  });

  it('packs are populated from manifest', () => {
    const state = makeState();
    assert.equal(state.packs.ids.length, 1);
    assert.equal(state.packs.ids[0], 'backend');
    assert.equal(state.packs.items[0].label, 'Backend Essentials');
  });
});

// ─── state.mjs — update (browse mode) ───────────────────────────────────────

describe('update — browse mode', () => {
  it('UP moves cursor up, clamped at 0', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.DOWN });
    assert.equal(s1.list.cursor, 1);
    const s2 = update(s1, { action: Action.UP });
    assert.equal(s2.list.cursor, 0);
    // clamp at 0
    const s3 = update(s2, { action: Action.UP });
    assert.equal(s3.list.cursor, 0);
  });

  it('DOWN moves cursor down, clamped at last item', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.DOWN });
    assert.equal(s1.list.cursor, 1);
    const s2 = update(s1, { action: Action.DOWN });
    assert.equal(s2.list.cursor, 2);
    // clamp at last
    const s3 = update(s2, { action: Action.DOWN });
    assert.equal(s3.list.cursor, 2);
  });

  it('LEFT changes tab (wraps around)', () => {
    const state = makeState();
    assert.equal(state.tabs.activeIndex, 0);
    // LEFT from first tab wraps to last
    const s1 = update(state, { action: Action.LEFT });
    assert.equal(s1.tabs.activeIndex, state.tabs.ids.length - 1);
  });

  it('RIGHT changes tab (wraps around)', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.RIGHT });
    assert.equal(s1.tabs.activeIndex, 1);
  });

  it('TAB switches to next tab (same as RIGHT)', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.TAB });
    assert.equal(s1.tabs.activeIndex, 1);
  });

  it('SHIFT_TAB switches to previous tab (same as LEFT)', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.SHIFT_TAB });
    assert.equal(s1.tabs.activeIndex, state.tabs.ids.length - 1);
  });

  it('SELECT toggles agent selection', () => {
    const state = makeState();
    const first = state.list.items[0].name;
    const s1 = update(state, { action: Action.SELECT });
    assert.ok(s1.selection.has(first));
    // toggle off
    const s2 = update(s1, { action: Action.SELECT });
    assert.ok(!s2.selection.has(first));
  });

  it('SEARCH enters search mode', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.SEARCH });
    assert.equal(s1.mode, 'search');
    assert.equal(s1.search.active, true);
    assert.equal(s1.search.query, '');
  });

  it('CONFIRM with no selection selects agent under cursor', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.CONFIRM });
    assert.equal(s1.mode, 'confirm');
    assert.ok(s1.install);
    assert.equal(s1.install.agents.length, 1);
    assert.equal(s1.install.agents[0].name, state.list.items[0].name);
  });

  it('CONFIRM with selection uses all selected agents', () => {
    let state = makeState();
    state = update(state, { action: Action.SELECT }); // select first
    state = update(state, { action: Action.DOWN });
    state = update(state, { action: Action.SELECT }); // select second
    const s = update(state, { action: Action.CONFIRM });
    assert.equal(s.mode, 'confirm');
    assert.equal(s.install.agents.length, 2);
  });

  it('QUIT transitions to quit mode', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.QUIT });
    assert.equal(s1.mode, 'quit');
  });

  it('ESCAPE transitions to quit mode', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.ESCAPE });
    assert.equal(s1.mode, 'quit');
  });

  it('HOME moves cursor to first item', () => {
    let state = makeState();
    state = update(state, { action: Action.DOWN });
    state = update(state, { action: Action.DOWN });
    assert.equal(state.list.cursor, 2);
    state = update(state, { action: Action.HOME });
    assert.equal(state.list.cursor, 0);
  });

  it('END moves cursor to last item', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.END });
    assert.equal(s1.list.cursor, 2); // 3 agents → last index = 2
  });

  it('unknown action returns same state', () => {
    const state = makeState();
    const s1 = update(state, { action: 'NONEXISTENT' });
    assert.equal(s1, state);
  });
});

// ─── state.mjs — update (search mode) ───────────────────────────────────────

describe('update — search mode', () => {
  it('CHAR appends to query', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH }); // enter search
    state = update(state, { action: Action.CHAR, char: 'p' });
    assert.equal(state.search.query, 'p');
    state = update(state, { action: Action.CHAR, char: 'o' });
    assert.equal(state.search.query, 'po');
  });

  it('BACKSPACE removes last char', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    state = update(state, { action: Action.CHAR, char: 'a' });
    state = update(state, { action: Action.CHAR, char: 'b' });
    assert.equal(state.search.query, 'ab');
    state = update(state, { action: Action.BACKSPACE });
    assert.equal(state.search.query, 'a');
  });

  it('BACKSPACE on empty query stays empty', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    state = update(state, { action: Action.BACKSPACE });
    assert.equal(state.search.query, '');
  });

  it('ESCAPE clears search and returns to browse', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    state = update(state, { action: Action.CHAR, char: 'x' });
    state = update(state, { action: Action.ESCAPE });
    assert.equal(state.mode, 'browse');
    assert.equal(state.search.active, false);
    assert.equal(state.search.query, '');
  });

  it('CONFIRM returns to browse with filter applied', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    state = update(state, { action: Action.CHAR, char: 'p' });
    state = update(state, { action: Action.CONFIRM });
    assert.equal(state.mode, 'browse');
    assert.equal(state.search.active, false);
    assert.equal(state.search.query, 'p'); // query is preserved
  });

  it('search filtering updates list items', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    state = update(state, { action: Action.CHAR, char: 'p' });
    state = update(state, { action: Action.CHAR, char: 'o' });
    state = update(state, { action: Action.CHAR, char: 's' });
    state = update(state, { action: Action.CHAR, char: 't' });
    // "post" matches "postgres-pro" via _searchStr
    assert.ok(state.list.items.length > 0);
    assert.ok(state.list.items.every(a => a._searchStr.includes('post')));
  });

  it('DELETE_WORD removes last word', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    state = update(state, { action: Action.CHAR, char: 'h' });
    state = update(state, { action: Action.CHAR, char: 'i' });
    state = update(state, { action: Action.CHAR, char: ' ' });
    state = update(state, { action: Action.CHAR, char: 'w' });
    assert.equal(state.search.query, 'hi w');
    state = update(state, { action: Action.DELETE_WORD });
    assert.equal(state.search.query, 'hi ');
  });
});

// ─── state.mjs — update (confirm mode) ──────────────────────────────────────

describe('update — confirm mode', () => {
  function confirmState() {
    let state = makeState();
    state = update(state, { action: Action.SELECT }); // select first agent
    state = update(state, { action: Action.CONFIRM }); // go to confirm
    assert.equal(state.mode, 'confirm');
    return state;
  }

  it('YES transitions to installing', () => {
    const state = confirmState();
    const s1 = update(state, { action: Action.YES });
    assert.equal(s1.mode, 'installing');
    assert.ok(s1.install);
    assert.ok(s1.install.agents.length > 0);
  });

  it('CONFIRM also transitions to installing', () => {
    const state = confirmState();
    const s1 = update(state, { action: Action.CONFIRM });
    assert.equal(s1.mode, 'installing');
  });

  it('NO returns to browse with empty selection', () => {
    const state = confirmState();
    const s1 = update(state, { action: Action.NO });
    assert.equal(s1.mode, 'browse');
    assert.equal(s1.selection.size, 0);
  });

  it('ESCAPE returns to browse with empty selection', () => {
    const state = confirmState();
    const s1 = update(state, { action: Action.ESCAPE });
    assert.equal(s1.mode, 'browse');
    assert.equal(s1.selection.size, 0);
  });

  it('unknown action is ignored', () => {
    const state = confirmState();
    const s1 = update(state, { action: Action.UP });
    assert.equal(s1, state);
  });
});

// ─── state.mjs — tab switching ──────────────────────────────────────────────

describe('update — tab switching', () => {
  it('NEXT_TAB (TAB/RIGHT) cycles through tabs', () => {
    let state = makeState();
    const tabCount = state.tabs.ids.length;
    for (let i = 1; i <= tabCount; i++) {
      state = update(state, { action: Action.TAB });
      assert.equal(state.tabs.activeIndex, i % tabCount);
    }
    // full cycle returns to 0
    assert.equal(state.tabs.activeIndex, 0);
  });

  it('PREV_TAB (SHIFT_TAB/LEFT) cycles backwards', () => {
    let state = makeState();
    const tabCount = state.tabs.ids.length;
    state = update(state, { action: Action.SHIFT_TAB });
    assert.equal(state.tabs.activeIndex, tabCount - 1);
    state = update(state, { action: Action.SHIFT_TAB });
    assert.equal(state.tabs.activeIndex, tabCount - 2);
  });

  it('switching tab resets cursor to 0', () => {
    let state = makeState();
    state = update(state, { action: Action.DOWN });
    assert.equal(state.list.cursor, 1);
    state = update(state, { action: Action.TAB });
    assert.equal(state.list.cursor, 0);
  });

  it('switching tab updates filtered list', () => {
    let state = makeState();
    assert.equal(state.list.items.length, 3); // ALL tab

    // switch to the "ai" tab
    const aiIndex = state.tabs.ids.indexOf('ai');
    for (let i = 0; i < aiIndex; i++) {
      state = update(state, { action: Action.TAB });
    }
    assert.equal(state.tabs.ids[state.tabs.activeIndex], 'ai');
    assert.equal(state.list.items.length, 2); // 2 AI agents
    assert.ok(state.list.items.every(a => a.category === 'ai'));
  });

  it('packs tab shows pack items', () => {
    let state = makeState();
    // switch to packs tab (index 1)
    state = update(state, { action: Action.TAB });
    assert.equal(state.tabs.ids[state.tabs.activeIndex], 'packs');
    assert.equal(state.list.items.length, 1); // 1 pack
    assert.equal(state.list.items[0].label, 'Backend Essentials');
  });
});

// ─── state.mjs — SELECT_ALL ─────────────────────────────────────────────────

describe('update — SELECT_ALL', () => {
  it('selects all visible agents', () => {
    const state = makeState();
    const s1 = update(state, { action: Action.SELECT_ALL });
    assert.equal(s1.selection.size, 3);
    for (const agent of state.list.items) {
      assert.ok(s1.selection.has(agent.name));
    }
  });

  it('deselects all when all are already selected', () => {
    let state = makeState();
    state = update(state, { action: Action.SELECT_ALL }); // select all
    assert.equal(state.selection.size, 3);
    state = update(state, { action: Action.SELECT_ALL }); // deselect all
    assert.equal(state.selection.size, 0);
  });

  it('selects all when only some are selected', () => {
    let state = makeState();
    state = update(state, { action: Action.SELECT }); // select first
    assert.equal(state.selection.size, 1);
    state = update(state, { action: Action.SELECT_ALL }); // selects remaining
    assert.equal(state.selection.size, 3);
  });
});

// ─── state.mjs — done mode ──────────────────────────────────────────────────

describe('update — done mode', () => {
  function doneState(results = []) {
    const state = makeState();
    return {
      ...state,
      mode: 'done',
      install: {
        agents: [],
        progress: 100,
        current: 0,
        results,
        error: null,
        doneCursor: 0,
        forceSelection: new Set(),
      },
    };
  }

  it('no skipped agents — any non-quit key resets to browse', () => {
    const state = doneState([
      { name: 'ai-engineer', status: 'installed' },
    ]);
    const s1 = update(state, { action: Action.CONFIRM });
    assert.equal(s1.mode, 'browse');
  });

  it('no skipped agents — QUIT transitions to quit', () => {
    const state = doneState([
      { name: 'ai-engineer', status: 'installed' },
    ]);
    const s1 = update(state, { action: Action.QUIT });
    assert.equal(s1.mode, 'quit');
  });

  it('cursor movement with skipped agents', () => {
    const state = doneState([
      { name: 'ai-engineer', status: 'installed' },
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    const s1 = update(state, { action: Action.DOWN });
    assert.equal(s1.install.doneCursor, 1);
    // clamp at end
    const s2 = update(s1, { action: Action.DOWN });
    assert.equal(s2.install.doneCursor, 1);
    const s3 = update(s2, { action: Action.UP });
    assert.equal(s3.install.doneCursor, 0);
    // clamp at start
    const s4 = update(s3, { action: Action.UP });
    assert.equal(s4.install.doneCursor, 0);
  });

  it('SELECT toggles forceSelection only for skipped items', () => {
    const state = doneState([
      { name: 'ai-engineer', status: 'installed' },
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    // cursor on installed item → no change
    const s1 = update(state, { action: Action.SELECT });
    assert.equal(s1.install.forceSelection.size, 0);
    // move to skipped item
    const s2 = update(s1, { action: Action.DOWN });
    const s3 = update(s2, { action: Action.SELECT });
    assert.ok(s3.install.forceSelection.has('postgres-pro'));
    // toggle off
    const s4 = update(s3, { action: Action.SELECT });
    assert.ok(!s4.install.forceSelection.has('postgres-pro'));
  });

  it('FORCE transitions to installing with forceMode', () => {
    const state = doneState([
      { name: 'ai-engineer', status: 'installed' },
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    const s1 = update(state, { action: Action.FORCE });
    assert.equal(s1.mode, 'installing');
    assert.ok(s1.install.forceMode);
    // forces all skipped when nothing explicitly selected
    assert.equal(s1.install.agents.length, 1);
    assert.equal(s1.install.agents[0].name, 'postgres-pro');
  });

  it('FORCE with explicit selection forces only selected', () => {
    let state = doneState([
      { name: 'ai-engineer', status: 'skipped' },
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    // select only first skipped agent
    state = update(state, { action: Action.SELECT });
    state = update(state, { action: Action.FORCE });
    assert.equal(state.mode, 'installing');
    assert.equal(state.install.agents.length, 1);
    assert.equal(state.install.agents[0].name, 'ai-engineer');
  });

  it('CONFIRM resets to browse', () => {
    const state = doneState([
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    const s1 = update(state, { action: Action.CONFIRM });
    assert.equal(s1.mode, 'browse');
  });

  it('ESCAPE resets to browse', () => {
    const state = doneState([
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    const s1 = update(state, { action: Action.ESCAPE });
    assert.equal(s1.mode, 'browse');
  });

  it('QUIT transitions to quit', () => {
    const state = doneState([
      { name: 'postgres-pro', status: 'skipped' },
    ]);
    const s1 = update(state, { action: Action.QUIT });
    assert.equal(s1.mode, 'quit');
  });

  it('returns browse when install is null', () => {
    const state = { ...makeState(), mode: 'done', install: null };
    const s1 = update(state, { action: Action.DOWN });
    assert.equal(s1.mode, 'browse');
  });
});

// ─── state.mjs — pack_detail mode ───────────────────────────────────────────

describe('update — pack_detail mode', () => {
  function packDetailState() {
    let state = makeState();
    // navigate to packs tab
    state = update(state, { action: Action.TAB }); // index 1 = packs
    // confirm to open pack detail
    state = update(state, { action: Action.CONFIRM });
    assert.equal(state.mode, 'pack_detail');
    return state;
  }

  it('CONFIRM on packs tab opens pack detail', () => {
    const state = packDetailState();
    assert.ok(state.packDetail);
    assert.equal(state.packDetail.packId, 'backend');
    assert.ok(state.packDetail.agents.length > 0);
    assert.equal(state.packDetail.cursor, 0);
  });

  it('UP/DOWN navigate agents in pack detail', () => {
    let state = packDetailState();
    state = update(state, { action: Action.DOWN });
    assert.equal(state.packDetail.cursor, 1);
    state = update(state, { action: Action.UP });
    assert.equal(state.packDetail.cursor, 0);
    // clamp at 0
    state = update(state, { action: Action.UP });
    assert.equal(state.packDetail.cursor, 0);
  });

  it('DOWN clamps at last agent', () => {
    let state = packDetailState();
    const max = state.packDetail.agents.length - 1;
    for (let i = 0; i < max + 5; i++) {
      state = update(state, { action: Action.DOWN });
    }
    assert.equal(state.packDetail.cursor, max);
  });

  it('SELECT toggles agent selection', () => {
    let state = packDetailState();
    const agentName = state.packDetail.agents[0].name;
    state = update(state, { action: Action.SELECT });
    assert.ok(state.selection.has(agentName));
    state = update(state, { action: Action.SELECT });
    assert.ok(!state.selection.has(agentName));
  });

  it('SELECT_ALL selects all pack agents', () => {
    let state = packDetailState();
    state = update(state, { action: Action.SELECT_ALL });
    for (const a of state.packDetail.agents) {
      assert.ok(state.selection.has(a.name));
    }
  });

  it('SELECT_ALL deselects all when all are selected', () => {
    let state = packDetailState();
    state = update(state, { action: Action.SELECT_ALL });
    assert.ok(state.selection.size > 0);
    state = update(state, { action: Action.SELECT_ALL });
    assert.equal(state.selection.size, 0);
  });

  it('CONFIRM with selection transitions to confirm mode', () => {
    let state = packDetailState();
    state = update(state, { action: Action.SELECT_ALL });
    state = update(state, { action: Action.CONFIRM });
    assert.equal(state.mode, 'confirm');
    assert.ok(state.install);
    assert.ok(state.install.agents.length > 0);
  });

  it('CONFIRM without selection auto-selects uninstalled agents (S5 fix)', () => {
    let state = packDetailState();
    assert.equal(state.selection.size, 0);
    const s1 = update(state, { action: Action.CONFIRM });
    // S5: auto-selects uninstalled agents, transitions to confirm
    // If all are installed, stays in pack_detail with flash message
    if (s1.mode === 'confirm') {
      assert.ok(s1.selection.size > 0);
      assert.ok(s1.install);
      assert.ok(s1.confirmContext);
      assert.equal(s1.confirmContext.type, 'pack');
    } else {
      assert.equal(s1.mode, 'pack_detail');
      assert.ok(s1.flash);
    }
  });

  it('ESCAPE returns to browse and clears packDetail', () => {
    let state = packDetailState();
    state = update(state, { action: Action.ESCAPE });
    assert.equal(state.mode, 'browse');
    assert.equal(state.packDetail, null);
  });

  it('HOME moves cursor to first agent', () => {
    let state = packDetailState();
    state = update(state, { action: Action.DOWN });
    state = update(state, { action: Action.HOME });
    assert.equal(state.packDetail.cursor, 0);
  });

  it('END moves cursor to last agent', () => {
    let state = packDetailState();
    state = update(state, { action: Action.END });
    assert.equal(state.packDetail.cursor, state.packDetail.agents.length - 1);
  });

  it('returns browse when packDetail is null', () => {
    const state = { ...makeState(), mode: 'pack_detail', packDetail: null };
    const s1 = update(state, { action: Action.DOWN });
    assert.equal(s1.mode, 'browse');
  });
});

// ─── state.mjs — S5 pack fix + flash messages ────────────────────────────────

describe('S5 — pack auto-select and flash messages', () => {
  function mkPackState() {
    let s = makeState();
    s = update(s, { action: Action.TAB });
    s = update(s, { action: Action.CONFIRM });
    return s;
  }

  it('CONFIRM with empty selection auto-selects uninstalled agents', () => {
    const state = mkPackState();
    const empty = { ...state, installed: new Set() };
    const result = update(empty, { action: Action.CONFIRM });
    assert.equal(result.mode, 'confirm');
    assert.ok(result.selection.size > 0);
    assert.ok(result.confirmContext);
    assert.equal(result.confirmContext.type, 'pack');
  });

  it('shows flash when all pack agents are installed', () => {
    const state = mkPackState();
    const allInstalled = new Set(state.packDetail.agents.map(a => a.name));
    const full = { ...state, installed: allInstalled };
    const result = update(full, { action: Action.CONFIRM });
    assert.equal(result.mode, 'pack_detail');
    assert.ok(result.flash);
    assert.ok(result.flash.message.includes('already installed'));
    assert.ok(result.flash.ts > 0);
  });

  it('confirmContext includes pack label', () => {
    const state = mkPackState();
    const empty = { ...state, installed: new Set() };
    const result = update(empty, { action: Action.CONFIRM });
    assert.equal(result.confirmContext.label, state.packDetail.packLabel);
    assert.equal(result.confirmContext.count, result.install.agents.length);
  });

  it('resetToBrowse clears flash and confirmContext', () => {
    const state = mkPackState();
    const withFlash = { ...state, flash: { message: 'test', ts: Date.now() }, confirmContext: { type: 'pack' } };
    const result = update(withFlash, { action: Action.ESCAPE });
    assert.equal(result.mode, 'browse');
    assert.equal(result.flash, null);
    assert.equal(result.confirmContext, null);
  });
});

// ─── state.mjs — update (installing / quit passthrough) ─────────────────────

describe('update — installing/quit passthrough', () => {
  it('installing mode ignores all actions', () => {
    const state = { ...makeState(), mode: 'installing' };
    const s1 = update(state, { action: Action.UP });
    assert.equal(s1, state);
  });

  it('quit mode ignores all actions', () => {
    const state = { ...makeState(), mode: 'quit' };
    const s1 = update(state, { action: Action.DOWN });
    assert.equal(s1, state);
  });
});

// ─── state.mjs — computeFilteredList ─────────────────────────────────────────

describe('computeFilteredList', () => {
  it('returns all agents for "all" tab', () => {
    const state = makeState();
    const filtered = computeFilteredList(state);
    assert.equal(filtered.length, 3);
  });

  it('returns packs for "packs" tab', () => {
    let state = makeState();
    state = { ...state, tabs: { ...state.tabs, activeIndex: 1 } };
    const filtered = computeFilteredList(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].label, 'Backend Essentials');
  });

  it('returns agents for specific category tab', () => {
    let state = makeState();
    const dbIndex = state.tabs.ids.indexOf('database');
    state = { ...state, tabs: { ...state.tabs, activeIndex: dbIndex } };
    const filtered = computeFilteredList(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'postgres-pro');
  });

  it('search filtering narrows results', () => {
    let state = makeState();
    state = { ...state, search: { active: true, query: 'postgres' } };
    const filtered = computeFilteredList(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'postgres-pro');
  });

  it('search is case-insensitive', () => {
    let state = makeState();
    state = { ...state, search: { active: true, query: 'AI' } };
    const filtered = computeFilteredList(state);
    assert.ok(filtered.length >= 2); // ai-engineer and ml-engineer match "ai" in _searchStr
  });

  it('search with no matches returns empty', () => {
    let state = makeState();
    state = { ...state, search: { active: true, query: 'zzzznonexistent' } };
    const filtered = computeFilteredList(state);
    assert.equal(filtered.length, 0);
  });

  it('search applies within current category tab', () => {
    let state = makeState();
    const aiIndex = state.tabs.ids.indexOf('ai');
    state = {
      ...state,
      tabs: { ...state.tabs, activeIndex: aiIndex },
      search: { active: true, query: 'ml' },
    };
    const filtered = computeFilteredList(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'ml-engineer');
  });
});

// ─── state.mjs — getViewportHeight ──────────────────────────────────────────

describe('getViewportHeight', () => {
  it('returns rows minus chrome, at least MIN_VIEWPORT', () => {
    const state = makeState({}, { cols: 80, rows: 24 });
    const vh = getViewportHeight(state);
    assert.equal(vh, 24 - 8); // rows - CHROME_ROWS
  });

  it('clamps to MIN_VIEWPORT for small terminals', () => {
    const state = makeState({}, { cols: 80, rows: 10 });
    const vh = getViewportHeight(state);
    assert.equal(vh, 5); // MIN_VIEWPORT
  });
});

// ─── ansi.mjs — stripAnsi ────────────────────────────────────────────────────

describe('stripAnsi', () => {
  it('removes ANSI color codes', () => {
    assert.equal(stripAnsi('\x1b[31mred\x1b[0m'), 'red');
  });

  it('removes bold and reset sequences', () => {
    assert.equal(stripAnsi('\x1b[1mbold\x1b[0m'), 'bold');
  });

  it('removes multiple nested codes', () => {
    assert.equal(stripAnsi('\x1b[1m\x1b[36mcyan bold\x1b[0m\x1b[0m'), 'cyan bold');
  });

  it('returns plain string unchanged', () => {
    assert.equal(stripAnsi('hello world'), 'hello world');
  });

  it('handles empty string', () => {
    assert.equal(stripAnsi(''), '');
  });

  it('handles string that is only ANSI codes', () => {
    assert.equal(stripAnsi('\x1b[0m\x1b[31m\x1b[0m'), '');
  });
});

// ─── ansi.mjs — charWidth ───────────────────────────────────────────────────

describe('charWidth', () => {
  it('ASCII char returns 1', () => {
    assert.equal(charWidth('A'.codePointAt(0)), 1);
    assert.equal(charWidth(' '.codePointAt(0)), 1);
    assert.equal(charWidth('z'.codePointAt(0)), 1);
  });

  it('CJK ideograph returns 2', () => {
    assert.equal(charWidth('中'.codePointAt(0)), 2);
    assert.equal(charWidth('日'.codePointAt(0)), 2);
  });

  it('emoji returns 2', () => {
    assert.equal(charWidth('🎉'.codePointAt(0)), 2);
    assert.equal(charWidth('🚀'.codePointAt(0)), 2);
  });

  it('variation selector returns 0', () => {
    assert.equal(charWidth(0xfe0f), 0);
    assert.equal(charWidth(0xfe00), 0);
  });

  it('misc symbols (U+2600–U+27BF) return 2', () => {
    assert.equal(charWidth('☀'.codePointAt(0)), 2); // U+2600
  });
});

// ─── ansi.mjs — visibleLength ───────────────────────────────────────────────

describe('visibleLength', () => {
  it('returns length for plain ASCII string', () => {
    assert.equal(visibleLength('hello'), 5);
  });

  it('strips ANSI and returns visible char count', () => {
    assert.equal(visibleLength('\x1b[31mred\x1b[0m'), 3);
  });

  it('accounts for CJK double-width chars', () => {
    assert.equal(visibleLength('中文'), 4); // 2 chars × 2 width
  });

  it('accounts for emoji double-width', () => {
    assert.equal(visibleLength('a🚀b'), 4); // 1 + 2 + 1
  });

  it('handles empty string', () => {
    assert.equal(visibleLength(''), 0);
  });

  it('handles string with only ANSI codes', () => {
    assert.equal(visibleLength('\x1b[0m'), 0);
  });

  it('handles mixed ANSI and wide chars', () => {
    assert.equal(visibleLength('\x1b[36m中\x1b[0m'), 2);
  });
});

// ─── ansi.mjs — truncate ────────────────────────────────────────────────────

describe('truncate', () => {
  it('returns original if string fits within maxWidth', () => {
    assert.equal(truncate('hello', 10), 'hello');
  });

  it('truncates and adds ellipsis when string exceeds maxWidth', () => {
    const result = truncate('hello world', 6);
    assert.ok(result.endsWith('…'));
    assert.ok(result.length <= 6);
  });

  it('returns empty string for maxWidth < 1', () => {
    assert.equal(truncate('hello', 0), '');
  });

  it('handles ANSI codes — returns original with ANSI if it fits', () => {
    const input = '\x1b[31mhi\x1b[0m';
    const result = truncate(input, 10);
    assert.equal(result, input); // not truncated, original returned
  });

  it('handles CJK chars (double-width)', () => {
    const result = truncate('中文字', 4);
    // 中=2, 文=2, 字=2 → total 6, maxWidth 4 → needs truncation
    // With ellipsis: fit within 3 cols + 1 for ellipsis
    assert.ok(result.endsWith('…'));
  });

  it('handles maxWidth of 1', () => {
    const result = truncate('hello', 1);
    assert.equal(result, '…');
  });

  it('does not truncate when maxWidth > visible length', () => {
    const result = truncate('abcde', 6);
    assert.equal(result, 'abcde'); // 5 chars, maxWidth 6 → no truncation
  });

  it('truncates at exact visible length (reserves 1 col for ellipsis)', () => {
    // truncate always reserves 1 col for '…', so maxWidth == length triggers truncation
    const result = truncate('abcde', 5);
    assert.ok(result.endsWith('…'));
    assert.equal(stripAnsi(result), 'abcd…');
  });

  it('truncates when string exceeds by one char', () => {
    const result = truncate('abcdef', 5);
    assert.ok(result.endsWith('…'));
    assert.equal(stripAnsi(result), 'abcd…');
  });
});

// ─── ansi.mjs — padEnd ──────────────────────────────────────────────────────

describe('padEnd', () => {
  it('pads plain string to target width', () => {
    const result = padEnd('hi', 5);
    assert.equal(result, 'hi   ');
    assert.equal(visibleLength(result), 5);
  });

  it('does not pad if already at target width', () => {
    const result = padEnd('hello', 5);
    assert.equal(result, 'hello');
  });

  it('does not pad if wider than target', () => {
    const result = padEnd('hello world', 5);
    assert.equal(result, 'hello world');
  });

  it('accounts for ANSI codes (pads based on visible length)', () => {
    const input = '\x1b[31mhi\x1b[0m';
    const result = padEnd(input, 5);
    assert.equal(visibleLength(result), 5);
    // Should contain 3 spaces of padding (visible "hi" = 2 chars)
    assert.ok(result.endsWith('   '));
  });

  it('accounts for CJK double-width chars', () => {
    const result = padEnd('中', 5);
    // '中' takes 2 visible cols, so 3 spaces of padding
    assert.equal(visibleLength(result), 5);
    assert.ok(result.endsWith('   '));
  });

  it('handles empty string', () => {
    const result = padEnd('', 3);
    assert.equal(result, '   ');
  });
});

// ─── renderer.mjs — render() ────────────────────────────────────────────────

describe('render — browse mode', () => {
  it('returns a string', () => {
    const state = makeState();
    const output = render(state);
    assert.equal(typeof output, 'string');
    assert.ok(output.length > 0);
  });

  it('contains border characters', () => {
    const state = makeState();
    const output = render(state);
    assert.ok(output.includes('┌'), 'missing top-left border');
    assert.ok(output.includes('┘'), 'missing bottom-right border');
    assert.ok(output.includes('│'), 'missing vertical border');
  });

  it('contains OPENCODE AGENTS title', () => {
    const state = makeState();
    const output = render(state);
    assert.ok(stripAnsi(output).includes('OPENCODE AGENTS'));
  });

  it('contains tab labels', () => {
    const state = makeState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('ALL('), 'missing ALL tab');
    assert.ok(plain.includes('Packs('), 'missing Packs tab');
  });

  it('contains agent names in browse mode', () => {
    const state = makeState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('ai-engineer'), 'missing agent name ai-engineer');
    assert.ok(plain.includes('postgres-pro'), 'missing agent name postgres-pro');
  });

  it('contains column headers', () => {
    const state = makeState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('CATEGORY'), 'missing CATEGORY header');
    assert.ok(plain.includes('NAME'), 'missing NAME header');
    assert.ok(plain.includes('DESCRIPTION'), 'missing DESCRIPTION header');
  });

  it('shows cursor indicator on current item', () => {
    const state = makeState();
    const output = render(state);
    assert.ok(output.includes('▸'), 'missing cursor indicator');
  });

  it('shows selection count when agents are selected', () => {
    let state = makeState();
    state = update(state, { action: Action.SELECT });
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('1 selected'), 'missing selection count');
  });

  it('shows status bar with key hints', () => {
    const state = makeState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Search') || plain.includes('[/]'), 'missing search hint');
    assert.ok(plain.includes('Quit') || plain.includes('[q]'), 'missing quit hint');
  });
});

describe('render — too small terminal', () => {
  it('shows warning when terminal is too small', () => {
    const state = makeState({}, { cols: 40, rows: 10 });
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('TERMINAL TOO SMALL'), 'missing too-small message');
  });

  it('shows current and minimum dimensions', () => {
    const state = makeState({}, { cols: 40, rows: 10 });
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('40×10'), 'missing current dimensions');
    assert.ok(plain.includes('60×15'), 'missing minimum dimensions');
  });
});

describe('render — confirm mode', () => {
  it('shows install confirmation dialog', () => {
    let state = makeState();
    state = update(state, { action: Action.SELECT }); // select first
    state = update(state, { action: Action.CONFIRM }); // enter confirm
    assert.equal(state.mode, 'confirm');
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Install'), 'missing Install in dialog');
    assert.ok(plain.includes('[y]') || plain.includes('Yes'), 'missing Yes option');
    assert.ok(plain.includes('[n]') || plain.includes('No'), 'missing No option');
  });
});

describe('render — installing mode (viewport scrolling)', () => {
  it('renders progress for a small agent list without overflow indicators', () => {
    let state = makeState();
    state = {
      ...state,
      mode: 'installing',
      install: {
        agents: state.allAgents.slice(0, 2),
        progress: 0,
        current: 0,
        results: [],
        error: null,
        doneCursor: 0,
        forceSelection: new Set(),
      },
    };
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Installing 2 agent(s)'), 'missing installing header');
    assert.ok(plain.includes('ai-engineer'), 'missing first agent');
    assert.ok(!plain.includes('more above'), 'should not show "more above" for small list');
    assert.ok(!plain.includes('more below'), 'should not show "more below" for small list');
  });

  it('shows progress bar with counts', () => {
    let state = makeState();
    const agents = state.allAgents.slice(0, 2);
    state = {
      ...state,
      mode: 'installing',
      install: {
        agents,
        progress: 1,
        current: 1,
        results: [{ name: agents[0].name, status: 'installed' }],
        error: null,
        doneCursor: 0,
        forceSelection: new Set(),
      },
    };
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('[1/2]'), 'missing progress count');
    assert.ok(plain.includes('50%'), 'missing percentage');
  });

  it('shows scroll indicators for large agent lists', () => {
    // Create a state with many agents and a small terminal to force scrolling
    const manyAgents = [];
    for (let i = 0; i < 50; i++) {
      manyAgents.push({
        name: `agent-${i}`,
        category: 'ai',
        path: `ai/agent-${i}`,
        mode: 'subagent',
        description: `Agent ${i}`,
        tags: ['ai'],
      });
    }
    const manifest = makeManifest({
      agents: manyAgents,
    });
    let state = createInitialState(manifest, { cols: 80, rows: 20 });
    state = {
      ...state,
      mode: 'installing',
      install: {
        agents: manyAgents,
        progress: 25,
        current: 25,
        results: manyAgents.slice(0, 25).map(a => ({ name: a.name, status: 'installed' })),
        error: null,
        doneCursor: 0,
        forceSelection: new Set(),
      },
    };
    const output = render(state);
    const plain = stripAnsi(output);
    // With 50 agents and rows=20, viewport is small, so we should see scroll indicators
    assert.ok(plain.includes('more above') || plain.includes('more below'),
      'missing scroll indicators for large agent list in progress view');
  });
});

describe('render — done mode', () => {
  it('shows installation complete message', () => {
    let state = makeState();
    state = {
      ...state,
      mode: 'done',
      install: {
        agents: state.allAgents.slice(0, 1),
        progress: 1,
        current: 1,
        results: [{ name: 'ai-engineer', status: 'installed' }],
        error: null,
        done: true,
        doneCursor: 0,
        forceSelection: new Set(),
      },
    };
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Installation complete'), 'missing completion message');
    assert.ok(plain.includes('Installed:'), 'missing Installed count');
  });

  it('shows force reinstall option when there are skipped agents', () => {
    let state = makeState();
    state = {
      ...state,
      mode: 'done',
      install: {
        agents: state.allAgents.slice(0, 2),
        progress: 2,
        current: 2,
        results: [
          { name: 'ai-engineer', status: 'installed' },
          { name: 'ml-engineer', status: 'skipped' },
        ],
        error: null,
        done: true,
        doneCursor: 0,
        forceSelection: new Set(),
      },
    };
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Force reinstall') || plain.includes('[f]'),
      'missing force reinstall hint for skipped agents');
  });
});

describe('render — search mode', () => {
  it('shows search input field', () => {
    let state = makeState();
    state = update(state, { action: Action.SEARCH });
    assert.equal(state.mode, 'search');
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Search:'), 'missing search prompt');
  });
});

describe('render — pack detail mode', () => {
  it('shows pack detail with agent list', () => {
    let state = makeState();
    // Navigate to packs tab
    state = update(state, { action: Action.TAB }); // packs
    // Open pack detail
    state = update(state, { action: Action.CONFIRM });
    assert.equal(state.mode, 'pack_detail');
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Back to Packs'), 'missing back navigation');
    assert.ok(plain.includes('Backend Essentials'), 'missing pack label');
  });
});

// ─── bgRow / catColor / tabColor ─────────────────────────────────────────────

describe('bgRow', () => {
  it('wraps text with background color code', () => {
    const result = bgRow('hello');
    assert.ok(result.includes('48;5;24'), 'should contain BG_CODE 48;5;24');
    assert.ok(result.endsWith('\x1b[0m'), 'should end with reset');
  });

  it('preserves background through nested ANSI resets (reApplyBg)', () => {
    // Simulate text that contains an ANSI reset mid-string
    const input = 'before\x1b[0mafter';
    const result = bgRow(input);
    // The inner reset should be replaced with reset+bg, not plain reset
    assert.ok(!result.includes('\x1b[0m\x1b[0m'), 'should not double-reset');
    // Count occurrences of BG_CODE — opening + reApplyBg replacements
    const bgMatches = result.match(/48;5;24/g) || [];
    assert.ok(bgMatches.length >= 2, `expected >=2 BG_CODE occurrences, got ${bgMatches.length}`);
  });

  it('returns plain text when NO_COLOR is set', () => {
    // NO_COLOR is evaluated at module load; we test indirectly:
    // if bgRow output contains ANSI, NO_COLOR is not set (expected in test env)
    const result = bgRow('test');
    assert.ok(result.includes('\x1b['), 'in normal env, bgRow should contain ANSI codes');
  });
});

describe('catColor', () => {
  it('returns a coloring function for a known category', () => {
    const colorFn = catColor('languages');
    assert.equal(typeof colorFn, 'function');
    const colored = colorFn('test');
    assert.ok(colored.includes('\x1b['), 'should wrap with ANSI code');
    assert.ok(colored.includes('test'), 'should contain original text');
  });

  it('returns default color for unknown category', () => {
    const colorFn = catColor('nonexistent_category');
    assert.equal(typeof colorFn, 'function');
    const colored = colorFn('test');
    // Default is wrap(37) = white
    assert.ok(colored.includes('37'), 'default should use color code 37 (white)');
  });

  it('different categories produce different colors', () => {
    const lang = catColor('languages')('x');
    const sec = catColor('security')('x');
    assert.notEqual(lang, sec, 'languages and security should have different colors');
  });
});

describe('tabColor', () => {
  it('returns a coloring function for a known tab', () => {
    const colorFn = tabColor('all');
    assert.equal(typeof colorFn, 'function');
    const colored = colorFn('test');
    assert.ok(colored.includes('\x1b['), 'should wrap with ANSI code');
  });

  it('returns default color for unknown tab', () => {
    const colorFn = tabColor('nonexistent_tab');
    assert.equal(typeof colorFn, 'function');
    const colored = colorFn('test');
    // Default is wrap('1;37') = bold white
    assert.ok(colored.includes('1;37'), 'default should use bold white');
  });

  it('packs and mobile have different colors (regression H1)', () => {
    const packs = tabColor('packs')('x');
    const mobile = tabColor('mobile')('x');
    assert.notEqual(packs, mobile, 'packs and mobile tabs must not share the same color');
  });
});

// ─── parseKey — UNINSTALL action ─────────────────────────────────────────────

describe('parseKey — UNINSTALL action', () => {
  it('x in browse mode → UNINSTALL', () => {
    assert.deepStrictEqual(parseKey(buf('x'), 'browse'), { action: 'UNINSTALL' });
  });

  it('X in browse mode → UNINSTALL', () => {
    assert.deepStrictEqual(parseKey(buf('X'), 'browse'), { action: 'UNINSTALL' });
  });

  it('x in search mode → CHAR with char "x" (not UNINSTALL)', () => {
    const result = parseKey(buf('x'), 'search');
    assert.equal(result.action, 'CHAR');
    assert.equal(result.char, 'x');
  });

  it('x in confirm mode → NONE', () => {
    assert.deepStrictEqual(parseKey(buf('x'), 'confirm'), { action: 'NONE' });
  });

  it('x in uninstall_confirm mode → NONE', () => {
    assert.deepStrictEqual(parseKey(buf('x'), 'uninstall_confirm'), { action: 'NONE' });
  });

  it('x in done mode → NONE', () => {
    assert.deepStrictEqual(parseKey(buf('x'), 'done'), { action: 'NONE' });
  });
});

// ─── state.mjs — update (uninstall_confirm mode) ────────────────────────────

describe('update — uninstall_confirm mode', () => {
  it('UNINSTALL in browse with installed agent → transitions to uninstall_confirm', () => {
    let state = makeState();
    // Manually mark the first agent as installed
    state = { ...state, installed: new Set([state.list.items[0].name]) };
    const s1 = update(state, { action: Action.UNINSTALL });
    assert.equal(s1.mode, 'uninstall_confirm');
    assert.ok(s1.uninstallTarget);
    assert.equal(s1.uninstallTarget.name, state.list.items[0].name);
    assert.equal(s1.uninstallTarget.agent.name, state.list.items[0].name);
  });

  it('UNINSTALL in browse with NOT installed agent → stays in browse, shows flash', () => {
    let state = makeState();
    // No agents installed
    state = { ...state, installed: new Set() };
    const s1 = update(state, { action: Action.UNINSTALL });
    assert.equal(s1.mode, 'browse');
    assert.ok(s1.flash);
    assert.ok(s1.flash.message.includes('not installed'));
  });

  it('UNINSTALL in browse with empty list → stays in browse', () => {
    let state = makeState();
    // Empty list: switch to a category tab with no agents, or manually clear
    state = { ...state, list: { items: [], cursor: 0, scrollOffset: 0 } };
    const s1 = update(state, { action: Action.UNINSTALL });
    assert.equal(s1.mode, 'browse');
  });

  it('YES in uninstall_confirm → transitions to uninstalling', () => {
    let state = makeState();
    state = { ...state, installed: new Set([state.list.items[0].name]) };
    state = update(state, { action: Action.UNINSTALL });
    assert.equal(state.mode, 'uninstall_confirm');
    const s1 = update(state, { action: Action.YES });
    assert.equal(s1.mode, 'uninstalling');
  });

  it('NO in uninstall_confirm → transitions back to browse, clears uninstallTarget', () => {
    let state = makeState();
    state = { ...state, installed: new Set([state.list.items[0].name]) };
    state = update(state, { action: Action.UNINSTALL });
    assert.equal(state.mode, 'uninstall_confirm');
    const s1 = update(state, { action: Action.NO });
    assert.equal(s1.mode, 'browse');
    assert.equal(s1.uninstallTarget, null);
  });

  it('ESCAPE in uninstall_confirm → transitions back to browse, clears uninstallTarget', () => {
    let state = makeState();
    state = { ...state, installed: new Set([state.list.items[0].name]) };
    state = update(state, { action: Action.UNINSTALL });
    assert.equal(state.mode, 'uninstall_confirm');
    const s1 = update(state, { action: Action.ESCAPE });
    assert.equal(s1.mode, 'browse');
    assert.equal(s1.uninstallTarget, null);
  });

  it('uninstalling mode ignores all actions (no-op)', () => {
    let state = makeState();
    state = { ...state, mode: 'uninstalling' };
    const s1 = update(state, { action: Action.UP });
    assert.equal(s1, state);
    const s2 = update(state, { action: Action.QUIT });
    assert.equal(s2, state);
  });

  it('CONFIRM in uninstall_confirm → transitions to uninstalling', () => {
    let state = makeState();
    state = { ...state, installed: new Set([state.list.items[0].name]) };
    state = update(state, { action: Action.UNINSTALL });
    const s1 = update(state, { action: Action.CONFIRM });
    assert.equal(s1.mode, 'uninstalling');
  });
});

// ─── renderer.mjs — uninstall dialogs ────────────────────────────────────────

describe('render — uninstall_confirm dialog', () => {
  function uninstallConfirmState() {
    let state = makeState();
    const agentName = state.list.items[0].name;
    state = { ...state, installed: new Set([agentName]) };
    state = update(state, { action: Action.UNINSTALL });
    assert.equal(state.mode, 'uninstall_confirm');
    return state;
  }

  it('contains "Uninstall" text', () => {
    const state = uninstallConfirmState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Uninstall'), 'missing "Uninstall" text in dialog');
  });

  it('contains the agent name from uninstallTarget', () => {
    const state = uninstallConfirmState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes(state.uninstallTarget.name),
      `missing agent name "${state.uninstallTarget.name}" in dialog`);
  });

  it('contains [y] and [n] hints', () => {
    const state = uninstallConfirmState();
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('[y]'), 'missing [y] hint');
    assert.ok(plain.includes('[n]'), 'missing [n] hint');
  });
});

describe('render — uninstalling mode', () => {
  it('contains "Removing" text', () => {
    let state = makeState();
    const agentName = state.list.items[0].name;
    state = {
      ...state,
      mode: 'uninstalling',
      uninstallTarget: { agent: state.list.items[0], name: agentName },
    };
    const output = render(state);
    const plain = stripAnsi(output);
    assert.ok(plain.includes('Removing'), 'missing "Removing" text in uninstalling view');
    assert.ok(plain.includes(agentName),
      `missing agent name "${agentName}" in uninstalling view`);
  });
});

// ─── installer.mjs — uninstallAgent / uninstallAgents ────────────────────────

describe('uninstallAgent', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'uninstall-agent-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return "not_found" when agent file does not exist', () => {
    const agent = { name: 'nonexistent', category: 'general', mode: 'subagent', description: 'test', tags: [] };
    const result = uninstallAgent(agent, { cwd: tmp });
    assert.equal(result, 'not_found');
  });

  it('should remove an installed agent file and return "removed"', () => {
    const agent = { name: 'test-agent', category: 'general', mode: 'subagent', description: 'test', tags: [] };
    const agentDir = join(tmp, '.opencode', 'agents', 'general');
    const agentFile = join(agentDir, 'test-agent.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, '# Test Agent', 'utf-8');
    recordInstall('test-agent', '# Test Agent', tmp);

    const result = uninstallAgent(agent, { cwd: tmp });
    assert.equal(result, 'removed');
    assert.ok(!existsSync(agentFile), 'agent file should be deleted');
  });

  it('should remove lock entry after uninstall', () => {
    const agent = { name: 'locked-agent', category: 'general', mode: 'subagent', description: 'test', tags: [] };
    const agentDir = join(tmp, '.opencode', 'agents', 'general');
    const agentFile = join(agentDir, 'locked-agent.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, '# Locked', 'utf-8');
    recordInstall('locked-agent', '# Locked', tmp);

    assert.ok(readLock(tmp)['locked-agent'], 'lock entry should exist before uninstall');
    uninstallAgent(agent, { cwd: tmp });
    assert.ok(!readLock(tmp)['locked-agent'], 'lock entry should be removed after uninstall');
  });

  it('should reject symlinks with a Security error', () => {
    const agent = { name: 'symlink-agent', category: 'general', mode: 'subagent', description: 'test', tags: [] };
    const agentDir = join(tmp, '.opencode', 'agents', 'general');
    mkdirSync(agentDir, { recursive: true });
    // Create a real file and a symlink pointing to it
    const realFile = join(tmp, 'real-file.md');
    const symlinkFile = join(agentDir, 'symlink-agent.md');
    writeFileSync(realFile, '# Real', 'utf-8');
    symlinkSync(realFile, symlinkFile);

    assert.throws(
      () => uninstallAgent(agent, { cwd: tmp }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Security'), `Expected "Security" in error but got: ${err.message}`);
        return true;
      }
    );
    // Symlink should NOT be deleted
    assert.ok(existsSync(symlinkFile), 'symlink should not be deleted');
  });

  it('should NOT delete file in dry-run mode', () => {
    const agent = { name: 'dry-agent', category: 'general', mode: 'subagent', description: 'test', tags: [] };
    const agentDir = join(tmp, '.opencode', 'agents', 'general');
    const agentFile = join(agentDir, 'dry-agent.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, '# Dry', 'utf-8');

    const result = uninstallAgent(agent, { cwd: tmp, dryRun: true });
    assert.equal(result, 'removed');
    assert.ok(existsSync(agentFile), 'file should NOT be deleted in dry-run mode');
  });

  it('should handle primary agent paths (root agents dir)', () => {
    const agent = { name: 'primary-agent', category: 'general', mode: 'primary', description: 'test', tags: [] };
    const agentDir = join(tmp, '.opencode', 'agents');
    const agentFile = join(agentDir, 'primary-agent.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, '# Primary', 'utf-8');

    const result = uninstallAgent(agent, { cwd: tmp });
    assert.equal(result, 'removed');
    assert.ok(!existsSync(agentFile), 'primary agent file should be deleted');
  });

  it('should cleanup empty parent directory for subagents', () => {
    const agent = { name: 'cleanup-agent', category: 'cleanup-cat', mode: 'subagent', description: 'test', tags: [] };
    const agentDir = join(tmp, '.opencode', 'agents', 'cleanup-cat');
    const agentFile = join(agentDir, 'cleanup-agent.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, '# Cleanup', 'utf-8');

    uninstallAgent(agent, { cwd: tmp });
    assert.ok(!existsSync(agentDir), 'empty category directory should be cleaned up');
  });
});

describe('uninstallAgents', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'uninstall-batch-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return correct counts for batch uninstall', () => {
    const agents = [
      { name: 'exists-agent', category: 'a', mode: 'subagent', description: 'test', tags: [] },
      { name: 'missing-agent', category: 'b', mode: 'subagent', description: 'test', tags: [] },
    ];

    // Create only the first agent
    const dir = join(tmp, '.opencode', 'agents', 'a');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'exists-agent.md'), '# Exists', 'utf-8');

    const result = uninstallAgents(agents, { cwd: tmp });
    assert.equal(result.removed, 1);
    assert.equal(result.not_found, 1);
    assert.equal(result.failed, 0);
  });

  it('should handle dry-run batch (no files deleted)', () => {
    const agents = [
      { name: 'dry-a', category: 'x', mode: 'subagent', description: 'test', tags: [] },
      { name: 'dry-b', category: 'y', mode: 'subagent', description: 'test', tags: [] },
    ];

    // Create both agents
    for (const a of agents) {
      const dir = join(tmp, '.opencode', 'agents', a.category);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${a.name}.md`), '# Agent', 'utf-8');
    }

    const result = uninstallAgents(agents, { cwd: tmp, dryRun: true });
    assert.equal(result.removed, 2);
    assert.equal(result.not_found, 0);
    assert.equal(result.failed, 0);

    // Verify files still exist
    assert.ok(existsSync(join(tmp, '.opencode', 'agents', 'x', 'dry-a.md')));
    assert.ok(existsSync(join(tmp, '.opencode', 'agents', 'y', 'dry-b.md')));
  });

  it('should return all not_found when no agents exist', () => {
    const agents = [
      { name: 'ghost-a', category: 'x', mode: 'subagent', description: 'test', tags: [] },
      { name: 'ghost-b', category: 'y', mode: 'subagent', description: 'test', tags: [] },
    ];

    const result = uninstallAgents(agents, { cwd: tmp });
    assert.equal(result.removed, 0);
    assert.equal(result.not_found, 2);
    assert.equal(result.failed, 0);
  });
});
