import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { Action } from '../src/tui/input.mjs';
import { createInitialState, update } from '../src/tui/state.mjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal manifest for state tests. */
function makeManifest(overrides = {}) {
  return {
    version: '1.0.0',
    base_path: '.opencode/agents',
    categories: {
      languages: { label: 'Languages' },
      web: { label: 'Web & Mobile' },
    },
    agents: [
      {
        name: 'typescript-pro',
        category: 'languages',
        path: 'languages/typescript-pro',
        mode: 'subagent',
        description: 'TypeScript expert',
        tags: ['typescript'],
      },
      {
        name: 'react-specialist',
        category: 'web',
        path: 'web/react-specialist',
        mode: 'subagent',
        description: 'React expert',
        tags: ['react'],
      },
      {
        name: 'python-expert',
        category: 'languages',
        path: 'languages/python-expert',
        mode: 'subagent',
        description: 'Python expert',
        tags: ['python'],
      },
    ],
    packs: {},
    ...overrides,
  };
}

/** Build a suggest-mode state with sensible defaults. */
function suggestState(overrides = {}) {
  const base = createInitialState(makeManifest(), { cols: 80, rows: 24 });
  return {
    ...base,
    mode: 'suggest',
    suggestions: [
      {
        agent: {
          name: 'typescript-pro',
          category: 'languages',
          description: 'TypeScript expert',
          mode: 'subagent',
          tags: [],
          path: 'languages/typescript-pro',
        },
        score: 0.8,
        reasons: ['Stack match: javascript'],
        sources: ['stack'],
      },
      {
        agent: {
          name: 'react-specialist',
          category: 'web',
          description: 'React expert',
          mode: 'subagent',
          tags: [],
          path: 'web/react-specialist',
        },
        score: 0.7,
        reasons: ['Stack match: javascript'],
        sources: ['stack'],
      },
    ],
    suggestCursor: 0,
    suggestSelected: new Set(['typescript-pro', 'react-specialist']),
    ...overrides,
  };
}

// ─── suggest mode — initial state ────────────────────────────────────────────

describe('suggest mode — initial state', () => {
  it('mode is "suggest" when constructed via suggestState()', () => {
    const state = suggestState();
    assert.equal(state.mode, 'suggest');
  });

  it('suggestions array contains the expected agents', () => {
    const state = suggestState();
    assert.equal(state.suggestions.length, 2);
    assert.equal(state.suggestions[0].agent.name, 'typescript-pro');
    assert.equal(state.suggestions[1].agent.name, 'react-specialist');
  });

  it('suggestCursor starts at 0', () => {
    const state = suggestState();
    assert.equal(state.suggestCursor, 0);
  });

  it('suggestSelected is a Set', () => {
    const state = suggestState();
    assert.ok(state.suggestSelected instanceof Set);
  });
});

// ─── suggest mode — cursor navigation ────────────────────────────────────────

describe('suggest mode — cursor navigation', () => {
  it('DOWN moves suggestCursor down', () => {
    const state = suggestState({ suggestCursor: 0 });
    const next = update(state, { action: Action.DOWN });
    assert.equal(next.suggestCursor, 1);
  });

  it('DOWN clamps at last suggestion index', () => {
    const state = suggestState({ suggestCursor: 1 }); // last index with 2 suggestions
    const next = update(state, { action: Action.DOWN });
    assert.equal(next.suggestCursor, 1, 'should clamp at last index');
  });

  it('UP at index 0 stays at 0', () => {
    const state = suggestState({ suggestCursor: 0 });
    const next = update(state, { action: Action.UP });
    assert.equal(next.suggestCursor, 0, 'cursor should not go below 0');
  });

  it('UP moves cursor up when not at 0', () => {
    const state = suggestState({ suggestCursor: 1 });
    const next = update(state, { action: Action.UP });
    assert.equal(next.suggestCursor, 0);
  });
});

// ─── suggest mode — selection ─────────────────────────────────────────────────

describe('suggest mode — SPACE (SELECT) toggles agent', () => {
  it('SELECT deselects an agent that is currently selected', () => {
    // cursor on typescript-pro, which is selected
    const state = suggestState({ suggestCursor: 0, suggestSelected: new Set(['typescript-pro', 'react-specialist']) });
    const next = update(state, { action: Action.SELECT });
    assert.ok(!next.suggestSelected.has('typescript-pro'), 'typescript-pro should be deselected');
    assert.ok(next.suggestSelected.has('react-specialist'), 'react-specialist should still be selected');
  });

  it('SELECT selects an agent that is not currently selected', () => {
    const state = suggestState({ suggestCursor: 0, suggestSelected: new Set() });
    const next = update(state, { action: Action.SELECT });
    assert.ok(next.suggestSelected.has('typescript-pro'), 'typescript-pro should now be selected');
  });

  it('SELECT returns same state when no suggestions', () => {
    const state = suggestState({ suggestions: [], suggestCursor: 0, suggestSelected: new Set() });
    const next = update(state, { action: Action.SELECT });
    assert.equal(next, state, 'should return same state reference when no suggestions');
  });
});

// ─── suggest mode — SELECT_ALL ────────────────────────────────────────────────

describe('suggest mode — A (SELECT_ALL)', () => {
  it('SELECT_ALL selects all when none are selected', () => {
    const state = suggestState({ suggestSelected: new Set() });
    const next = update(state, { action: Action.SELECT_ALL });
    assert.ok(next.suggestSelected.has('typescript-pro'));
    assert.ok(next.suggestSelected.has('react-specialist'));
  });

  it('SELECT_ALL deselects all when all are selected', () => {
    const state = suggestState({ suggestSelected: new Set(['typescript-pro', 'react-specialist']) });
    const next = update(state, { action: Action.SELECT_ALL });
    assert.equal(next.suggestSelected.size, 0, 'all should be deselected after SELECT_ALL when all were selected');
  });

  it('SELECT_ALL selects all when only some are selected', () => {
    const state = suggestState({ suggestSelected: new Set(['typescript-pro']) });
    const next = update(state, { action: Action.SELECT_ALL });
    assert.ok(next.suggestSelected.has('typescript-pro'));
    assert.ok(next.suggestSelected.has('react-specialist'));
  });

  it('SELECT_ALL returns same state when no suggestions', () => {
    const state = suggestState({ suggestions: [], suggestSelected: new Set() });
    const next = update(state, { action: Action.SELECT_ALL });
    assert.equal(next, state, 'should return same state reference when no suggestions');
  });
});

// ─── suggest mode — ENTER (CONFIRM) ──────────────────────────────────────────

describe('suggest mode — ENTER (CONFIRM)', () => {
  it('ENTER with selections → transitions to "confirm" mode', () => {
    const state = suggestState({ suggestSelected: new Set(['typescript-pro']) });
    const next = update(state, { action: Action.CONFIRM });
    assert.equal(next.mode, 'confirm');
  });

  it('ENTER with selections → install list contains selected agents', () => {
    const state = suggestState({ suggestSelected: new Set(['typescript-pro']) });
    const next = update(state, { action: Action.CONFIRM });
    assert.ok(next.install, 'install should be set');
    assert.equal(next.install.agents.length, 1);
    assert.equal(next.install.agents[0].name, 'typescript-pro');
  });

  it('ENTER with multiple selections → all selected agents in install list', () => {
    const state = suggestState({ suggestSelected: new Set(['typescript-pro', 'react-specialist']) });
    const next = update(state, { action: Action.CONFIRM });
    assert.equal(next.mode, 'confirm');
    assert.equal(next.install.agents.length, 2);
    const names = next.install.agents.map(a => a.name);
    assert.ok(names.includes('typescript-pro'));
    assert.ok(names.includes('react-specialist'));
  });

  it('ENTER with no selection → transitions to "browse"', () => {
    const state = suggestState({ suggestSelected: new Set() });
    const next = update(state, { action: Action.CONFIRM });
    assert.equal(next.mode, 'browse');
  });

  it('ENTER with no selection → suggestions are cleared', () => {
    const state = suggestState({ suggestSelected: new Set() });
    const next = update(state, { action: Action.CONFIRM });
    assert.equal(next.suggestions.length, 0);
    assert.equal(next.suggestCursor, 0);
    assert.equal(next.suggestSelected.size, 0);
  });

  it('ENTER with selection → suggestions and cursor are reset after transition', () => {
    const state = suggestState({ suggestSelected: new Set(['typescript-pro']) });
    const next = update(state, { action: Action.CONFIRM });
    assert.equal(next.suggestions.length, 0);
    assert.equal(next.suggestCursor, 0);
    assert.equal(next.suggestSelected.size, 0);
  });
});

// ─── suggest mode — ESCAPE / B (browse) ──────────────────────────────────────

describe('suggest mode — ESCAPE / B transitions to browse', () => {
  it('ESCAPE → transitions to "browse"', () => {
    const state = suggestState();
    const next = update(state, { action: Action.ESCAPE });
    assert.equal(next.mode, 'browse');
  });

  it('ESCAPE → clears suggestions', () => {
    const state = suggestState();
    const next = update(state, { action: Action.ESCAPE });
    assert.equal(next.suggestions.length, 0);
    assert.equal(next.suggestCursor, 0);
    assert.equal(next.suggestSelected.size, 0);
  });

  it('BROWSE action → transitions to "browse"', () => {
    const state = suggestState();
    const next = update(state, { action: Action.BROWSE });
    assert.equal(next.mode, 'browse');
  });

  it('BROWSE action → clears suggestions', () => {
    const state = suggestState();
    const next = update(state, { action: Action.BROWSE });
    assert.equal(next.suggestions.length, 0);
    assert.equal(next.suggestCursor, 0);
    assert.equal(next.suggestSelected.size, 0);
  });
});

// ─── suggest mode — QUIT ─────────────────────────────────────────────────────

describe('suggest mode — QUIT', () => {
  it('QUIT → transitions to "quit" mode', () => {
    const state = suggestState();
    const next = update(state, { action: Action.QUIT });
    assert.equal(next.mode, 'quit');
  });
});

// ─── suggest mode — unknown actions ──────────────────────────────────────────

describe('suggest mode — unknown actions', () => {
  it('unknown action returns same state', () => {
    const state = suggestState();
    const next = update(state, { action: 'NONEXISTENT' });
    assert.equal(next, state, 'unknown action should return same state reference');
  });
});
