// ─── state.mjs ── State machine for TUI commander ───────────────────────────
// Returns new state copies on every transition.
// detectInstalled() performs filesystem I/O to detect pre-installed agents.

import { Action } from './input.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { detectInstalledSet } from '../lock.mjs';

// ─── Constants ───────────────────────────────────────────────────────────────

const CHROME_ROWS = 8;
const MIN_VIEWPORT = 5;

// ─── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {'browse'|'search'|'confirm'|'installing'|'pack_detail'|'done'|'uninstall_confirm'|'uninstalling'|'quit'} TuiMode
 */

/**
 * @typedef {import('../registry.mjs').AgentEntry} AgentEntry
 * @typedef {import('../registry.mjs').PackDef} PackDef
 * @typedef {import('../registry.mjs').Manifest} Manifest
 * @typedef {AgentEntry & { _searchStr: string }} TuiAgentEntry
 */

/**
 * @typedef {Object} TuiState
 * @property {TuiMode} mode
 * @property {{ ids: string[], labels: string[], activeIndex: number }} tabs
 * @property {{ items: AgentEntry[], cursor: number, scrollOffset: number }} list
 * @property {Set<string>} selection
 * @property {{ active: boolean, query: string }} search
 * @property {{ ids: string[], items: PackDef[] }} packs
 * @property {Object|null} packDetail
 * @property {{ agents: AgentEntry[], progress: number, current: number, results: Array<{name: string, status: string}>, error: string|null, doneCursor: number, forceSelection: Set<string>, forceMode?: boolean }|null} install
 * @property {{ cols: number, rows: number }} terminal
 * @property {Manifest} manifest
 * @property {Set<string>} installed
 * @property {AgentEntry[]} allAgents
 * @property {{ message: string, ts: number }|null} flash
 * @property {{ type: string, label?: string, count: number }|null} confirmContext
 * @property {{ agent: AgentEntry, name: string }|null} uninstallTarget
 */

// ─── Exports ─────────────────────────────────────────────────────────────────

/**
 * Scan .opencode/agents/ to detect already-installed agent files.
 * Delegates to the lock-based detection for hash-aware state tracking.
 * @param {Manifest} manifest
 * @returns {Set<string>}  Set of installed agent names
 */
export function detectInstalled(manifest) {
  return detectInstalledSet(manifest);
}

/**
 * Create the initial state from a loaded manifest.
 * @param {Manifest} manifest
 * @param {{ cols: number, rows: number }} terminal
 * @returns {TuiState}
 */
export function createInitialState(manifest, terminal) {
  const categoryIds = Object.keys(manifest.categories);
  const allAgents = manifest.agents.map(a => ({
    ...a,
    _searchStr: `${a.name} ${a.description} ${a.category}`.toLowerCase(),
  }));
  const packIds = Object.keys(manifest.packs);

  const tabIds = ['all', 'packs', ...categoryIds];
  const tabLabels = [
    `ALL(${allAgents.length})`,
    `Packs(${packIds.length})`,
    ...categoryIds.map(id => {
      const count = allAgents.filter(a => a.category === id).length;
      const short = manifest.categories[id].label.split(/[\s&]/)[0];
      return `${short}(${count})`;
    }),
  ];

  return {
    mode: 'browse',
    tabs: { ids: tabIds, labels: tabLabels, activeIndex: 0 },
    list: { items: allAgents, cursor: 0, scrollOffset: 0 },
    selection: new Set(),
    installed: detectInstalled(manifest),
    search: { active: false, query: '' },
    packs: {
      ids: packIds,
      items: packIds.map(id => ({ id, ...manifest.packs[id] })),
    },
    packDetail: null,
    install: null,
    flash: null,
    confirmContext: null,
    uninstallTarget: null,
    terminal,
    manifest,
    allAgents,
  };
}

/**
 * Pure reducer: apply a parsed action to produce a new state.
 * @param {TuiState} state
 * @param {{ action: string, char?: string }} parsed
 * @returns {TuiState}
 */
export function update(state, parsed) {
  switch (state.mode) {
    case 'browse':      return updateBrowse(state, parsed);
    case 'search':      return updateSearch(state, parsed);
    case 'confirm':     return updateConfirm(state, parsed);
    case 'pack_detail': return updatePackDetail(state, parsed);
    case 'installing':  return state;
    case 'done':
      return updateDone(state, parsed);
    case 'uninstall_confirm': return updateUninstallConfirm(state, parsed);
    case 'uninstalling':      return state;
    case 'quit':        return state;
    default:            return state;
  }
}

/**
 * Compute the filtered agent list based on current tab and search query.
 * When the active tab is 'packs', returns PackDef[] (with id property).
 * For all other tabs, returns AgentEntry[] optionally filtered by search query.
 * @param {TuiState} state
 * @returns {AgentEntry[] | PackDef[]}
 */
export function computeFilteredList(state) {
  const tabId = state.tabs.ids[state.tabs.activeIndex];
  let agents;

  if (tabId === 'all') {
    agents = state.allAgents;
  } else if (tabId === 'packs') {
    return state.packs.items;
  } else {
    agents = state.allAgents.filter(a => a.category === tabId);
  }

  if (state.search.query) {
    const q = state.search.query.toLowerCase();
    agents = agents.filter(a => a._searchStr.includes(q));
  }

  return agents;
}

/**
 * Get the viewport height (visible list rows).
 * @param {TuiState} state
 * @returns {number}
 */
export function getViewportHeight(state) {
  return Math.max(MIN_VIEWPORT, state.terminal.rows - CHROME_ROWS);
}

// ─── Reducers (internal) ─────────────────────────────────────────────────────

/** @param {TuiState} state @param {{ action: string, char?: string }} parsed */
function updateBrowse(state, { action }) {
  switch (action) {
    case Action.UP:        return moveCursor(state, -1);
    case Action.DOWN:      return moveCursor(state, +1);
    case Action.PAGE_UP:   return moveCursor(state, -getViewportHeight(state));
    case Action.PAGE_DOWN: return moveCursor(state, +getViewportHeight(state));
    case Action.HOME:      return moveCursorTo(state, 0);
    case Action.END:       return moveCursorTo(state, state.list.items.length - 1);
    case Action.LEFT:
    case Action.SHIFT_TAB: return switchTab(state, -1);
    case Action.RIGHT:
    case Action.TAB:       return switchTab(state, +1);
    case Action.SELECT:    {
      // On packs tab, Space drills into the pack (same as Enter)
      const isPacksTab = state.tabs.ids[state.tabs.activeIndex] === 'packs';
      if (isPacksTab) return handleConfirm(state);
      return toggleSelection(state);
    }
    case Action.SELECT_ALL: return toggleSelectAll(state);
    case Action.CONFIRM:   return handleConfirm(state);
    case Action.SEARCH:    return { ...state, mode: 'search', search: { active: true, query: '' } };
    case Action.UNINSTALL: {
      const item = state.list.items[state.list.cursor];
      if (!item?.name) return state;
      if (!state.installed?.has(item.name)) {
        return { ...state, flash: { message: `"${item.name}" is not installed`, ts: Date.now() } };
      }
      return {
        ...state,
        mode: 'uninstall_confirm',
        uninstallTarget: { agent: item, name: item.name },
      };
    }
    case Action.QUIT:
    case Action.ESCAPE:    return { ...state, mode: 'quit' };
    default:               return state;
  }
}

/** @param {TuiState} state @param {{ action: string, char?: string }} parsed */
function updateSearch(state, { action, char }) {
  switch (action) {
    case Action.ESCAPE:
      return refilter({ ...state, mode: 'browse', search: { active: false, query: '' } });

    case Action.CONFIRM:
      return { ...state, mode: 'browse', search: { ...state.search, active: false } };

    case Action.BACKSPACE: {
      const query = state.search.query.slice(0, -1);
      return refilter({ ...state, search: { ...state.search, query } });
    }

    case Action.DELETE_WORD: {
      const q = state.search.query;
      const lastSpace = q.trimEnd().lastIndexOf(' ');
      const query = lastSpace >= 0 ? q.slice(0, lastSpace + 1) : '';
      return refilter({ ...state, search: { ...state.search, query } });
    }

    case Action.CHAR: {
      const query = state.search.query + char;
      return refilter({ ...state, search: { ...state.search, query } });
    }

    default: return state;
  }
}

/** @param {TuiState} state @param {{ action: string }} parsed */
function updateConfirm(state, { action }) {
  switch (action) {
    case Action.YES:
    case Action.CONFIRM: {
      const agents = state.install?.agents || [];
      return {
        ...state,
        mode: 'installing',
        install: { agents, progress: 0, current: 0, results: [], error: null, doneCursor: 0, forceSelection: new Set() },
      };
    }
    case Action.NO:
    case Action.ESCAPE:
      return { ...state, mode: 'browse', selection: new Set() };
    default: return state;
  }
}

/** @param {TuiState} state @param {{ action: string }} parsed */
function updatePackDetail(state, { action }) {
  if (!state.packDetail) return { ...state, mode: 'browse' };

  switch (action) {
    case Action.UP: {
      const max = state.packDetail.agents.length - 1;
      if (max < 0) return state;
      const cursor = Math.max(0, state.packDetail.cursor - 1);
      return adjustPackDetailScroll({ ...state, packDetail: { ...state.packDetail, cursor } });
    }
    case Action.DOWN: {
      const max = state.packDetail.agents.length - 1;
      if (max < 0) return state;
      const cursor = Math.min(max, state.packDetail.cursor + 1);
      return adjustPackDetailScroll({ ...state, packDetail: { ...state.packDetail, cursor } });
    }
    case Action.PAGE_UP: {
      const max = state.packDetail.agents.length - 1;
      if (max < 0) return state;
      const vh = Math.max(1, getViewportHeight(state) - 2);
      const cursor = Math.max(0, state.packDetail.cursor - vh);
      return adjustPackDetailScroll({ ...state, packDetail: { ...state.packDetail, cursor } });
    }
    case Action.PAGE_DOWN: {
      const max = state.packDetail.agents.length - 1;
      if (max < 0) return state;
      const vh = Math.max(1, getViewportHeight(state) - 2);
      const cursor = Math.min(max, state.packDetail.cursor + vh);
      return adjustPackDetailScroll({ ...state, packDetail: { ...state.packDetail, cursor } });
    }
    case Action.HOME: {
      if (state.packDetail.agents.length === 0) return state;
      return adjustPackDetailScroll({ ...state, packDetail: { ...state.packDetail, cursor: 0 } });
    }
    case Action.END: {
      const max = state.packDetail.agents.length - 1;
      if (max < 0) return state;
      return adjustPackDetailScroll({ ...state, packDetail: { ...state.packDetail, cursor: max } });
    }
    case Action.SELECT: {
      const agent = state.packDetail.agents[state.packDetail.cursor];
      if (!agent) return state;
      const selection = new Set(state.selection);
      if (selection.has(agent.name)) {
        selection.delete(agent.name);
      } else {
        selection.add(agent.name);
      }
      return { ...state, selection };
    }
    case Action.SELECT_ALL: {
      const pAgents = state.packDetail.agents;
      if (pAgents.length === 0) return state;
      const allSelected = pAgents.every(a => state.selection.has(a.name));
      const selection = new Set(state.selection);
      for (const a of pAgents) {
        if (allSelected) selection.delete(a.name);
        else selection.add(a.name);
      }
      return { ...state, selection };
    }
    case Action.CONFIRM: {
      let sel = state.selection;
      if (sel.size === 0) {
        // S5: Auto-select all uninstalled agents in the pack
        const uninstalled = state.packDetail.agents.filter(a => !state.installed?.has(a.name));
        if (uninstalled.length === 0) {
          return { ...state, flash: { message: 'All agents in this pack are already installed', ts: Date.now() } };
        }
        sel = new Set(uninstalled.map(a => a.name));
      }
      const agents = state.allAgents.filter(a => sel.has(a.name));
      if (agents.length === 0) return state;
      return {
        ...state,
        mode: 'confirm',
        selection: sel,
        install: { agents, progress: 0, current: 0, results: [], error: null, doneCursor: 0, forceSelection: new Set() },
        confirmContext: { type: 'pack', label: state.packDetail.packLabel, count: agents.length },
      };
    }
    case Action.ESCAPE:
      return { ...state, mode: 'browse', packDetail: null, flash: null, confirmContext: null };
    default: return state;
  }
}

/** @param {TuiState} state @param {{ action: string }} parsed */
function updateDone(state, { action }) {
  if (!state.install) return resetToBrowse(state);

  const { results } = state.install;
  const skippedNames = results.filter(r => r.status === 'skipped').map(r => r.name);

  // No skipped agents → any key continues (except quit)
  if (skippedNames.length === 0) {
    if (action === Action.QUIT) return { ...state, mode: 'quit' };
    return resetToBrowse(state);
  }

  switch (action) {
    case Action.QUIT:
      return { ...state, mode: 'quit' };

    case Action.UP: {
      const cursor = Math.max(0, state.install.doneCursor - 1);
      return { ...state, install: { ...state.install, doneCursor: cursor } };
    }
    case Action.DOWN: {
      const cursor = Math.min(results.length - 1, state.install.doneCursor + 1);
      return { ...state, install: { ...state.install, doneCursor: cursor } };
    }

    case Action.SELECT: {
      const r = results[state.install.doneCursor];
      if (!r || r.status !== 'skipped') return state;
      const forceSelection = new Set(state.install.forceSelection);
      if (forceSelection.has(r.name)) {
        forceSelection.delete(r.name);
      } else {
        forceSelection.add(r.name);
      }
      return { ...state, install: { ...state.install, forceSelection } };
    }

    case Action.FORCE: {
      // If nothing explicitly selected, force all skipped
      let toForce = state.install.forceSelection;
      if (toForce.size === 0) {
        toForce = new Set(skippedNames);
      }
      const agents = state.allAgents.filter(a => toForce.has(a.name));
      if (agents.length === 0) return state;
      return {
        ...state,
        mode: 'installing',
        install: {
          agents,
          progress: 0,
          current: 0,
          results: [],
          error: null,
          doneCursor: 0,
          forceSelection: new Set(),
          forceMode: true,
        },
      };
    }

    case Action.CONFIRM:
    case Action.ESCAPE:
      return resetToBrowse(state);

    default:
      return state;
  }
}

/** @param {TuiState} state @param {{ action: string }} parsed */
function updateUninstallConfirm(state, { action }) {
  switch (action) {
    case Action.YES:
    case Action.CONFIRM:
      return { ...state, mode: 'uninstalling' };
    case Action.NO:
    case Action.ESCAPE:
      return { ...state, mode: 'browse', uninstallTarget: null };
    default:
      return state;
  }
}

/**
 * Adjust scrollOffset for pack detail so cursor stays within the viewport.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function adjustPackDetailScroll(state) {
  const vh = Math.max(1, getViewportHeight(state) - 2);
  let { cursor, scrollOffset } = state.packDetail;

  if (cursor >= scrollOffset + vh) {
    scrollOffset = cursor - vh + 1;
  }
  if (cursor < scrollOffset) {
    scrollOffset = cursor;
  }

  return { ...state, packDetail: { ...state.packDetail, scrollOffset } };
}

// ─── Helpers (internal) ──────────────────────────────────────────────────────

/**
 * Recompute filtered list and clamp cursor.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function refilter(state) {
  const items = computeFilteredList(state);
  return {
    ...state,
    list: {
      items,
      cursor: Math.min(state.list.cursor, Math.max(0, items.length - 1)),
      scrollOffset: 0,
    },
  };
}

/**
 * Move cursor by a relative delta, clamped, and adjust scroll.
 * @param {TuiState} state
 * @param {number} delta
 * @returns {TuiState}
 */
function moveCursor(state, delta) {
  const max = state.list.items.length - 1;
  if (max < 0) return state;
  const cursor = Math.max(0, Math.min(max, state.list.cursor + delta));
  return adjustScroll({ ...state, list: { ...state.list, cursor } });
}

/**
 * Move cursor to an absolute index, clamped, and adjust scroll.
 * @param {TuiState} state
 * @param {number} index
 * @returns {TuiState}
 */
function moveCursorTo(state, index) {
  const max = state.list.items.length - 1;
  if (max < 0) return state;
  const cursor = Math.max(0, Math.min(max, index));
  return adjustScroll({ ...state, list: { ...state.list, cursor } });
}

/**
 * Adjust scrollOffset so cursor stays within the viewport.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function adjustScroll(state) {
  const vh = getViewportHeight(state);
  let { cursor, scrollOffset } = state.list;

  if (cursor >= scrollOffset + vh) {
    scrollOffset = cursor - vh + 1;
  }
  if (cursor < scrollOffset) {
    scrollOffset = cursor;
  }

  return { ...state, list: { ...state.list, scrollOffset } };
}

/**
 * Switch to the next/previous tab (with wrap) and refilter.
 * @param {TuiState} state
 * @param {number} direction  +1 or -1
 * @returns {TuiState}
 */
function switchTab(state, direction) {
  const count = state.tabs.ids.length;
  const next = (state.tabs.activeIndex + direction + count) % count;
  const updated = {
    ...state,
    tabs: { ...state.tabs, activeIndex: next },
    list: { ...state.list, cursor: 0, scrollOffset: 0 },
  };
  return refilter(updated);
}

/**
 * Toggle selection of the agent under the cursor.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function toggleSelection(state) {
  const agent = state.list.items[state.list.cursor];
  if (!agent?.name) return state;

  const selection = new Set(state.selection);
  if (selection.has(agent.name)) {
    selection.delete(agent.name);
  } else {
    selection.add(agent.name);
  }
  return { ...state, selection };
}

/**
 * Toggle select-all: if every visible agent is selected, deselect all; otherwise select all.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function toggleSelectAll(state) {
  const visible = state.list.items.filter(a => a.name);
  if (visible.length === 0) return state;

  const allSelected = visible.every(a => state.selection.has(a.name));
  const selection = new Set(state.selection);

  if (allSelected) {
    for (const a of visible) selection.delete(a.name);
  } else {
    for (const a of visible) selection.add(a.name);
  }
  return { ...state, selection };
}

/**
 * Handle confirm action: drill into pack or prepare install.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function handleConfirm(state) {
  const isPacksTab = state.tabs.ids[state.tabs.activeIndex] === 'packs';

  if (isPacksTab && !state.packDetail) {
    const packIndex = state.list.cursor;
    const packId = state.packs.ids[packIndex];
    const pack = state.manifest.packs[packId];
    if (!pack) return state;

    const agents = pack.agents
      .map(name => state.allAgents.find(a => a.name === name))
      .filter(Boolean);

    return {
      ...state,
      mode: 'pack_detail',
      packDetail: {
        packId,
        packLabel: pack.label,
        agents,
        cursor: 0,
        scrollOffset: 0,
      },
    };
  }

  const agents = state.selection.size > 0
    ? state.allAgents.filter(a => state.selection.has(a.name))
    : state.list.items[state.list.cursor]
      ? [state.list.items[state.list.cursor]]
      : [];

  if (agents.length === 0) return state;

  return {
    ...state,
    mode: 'confirm',
    install: { agents, progress: 0, current: 0, results: [], error: null, doneCursor: 0, forceSelection: new Set() },
    confirmContext: { type: 'agents', count: agents.length },
  };
}

/**
 * Reset to browse mode after done/quit.
 * @param {TuiState} state
 * @returns {TuiState}
 */
function resetToBrowse(state) {
  const updated = {
    ...state,
    mode: 'browse',
    selection: new Set(),
    install: null,
    packDetail: null,
    search: { active: false, query: '' },
    flash: null,
    confirmContext: null,
    uninstallTarget: null,
  };
  return refilter(updated);
}
