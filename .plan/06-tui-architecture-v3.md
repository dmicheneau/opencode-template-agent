# TUI Architecture — opencode-agents Interactive Browser

> **Status**: Architecture Specification  
> **Target**: `src/tui/` module  
> **Contraintes**: Zero npm deps, Node.js 20+ ESM, raw-mode ANSI TUI  
> **Style**: Commander / hacker-news-terminal

---

## Table of Contents

1. [Overview](#1-overview)
2. [File Structure](#2-file-structure)
3. [Module Breakdown](#3-module-breakdown)
4. [State Machine](#4-state-machine)
5. [Render Pipeline](#5-render-pipeline)
6. [Input Handling](#6-input-handling)
7. [Scroll Management](#7-scroll-management)
8. [Tab Navigation](#8-tab-navigation)
9. [Search Mode](#9-search-mode)
10. [Multi-Select](#10-multi-select)
11. [Pack Drill-Down](#11-pack-drill-down)
12. [Installation Flow](#12-installation-flow)
13. [Integration Point](#13-integration-point)
14. [ANSI Escape Sequences Reference](#14-ansi-escape-sequences-reference)
15. [Edge Cases & Error Handling](#15-edge-cases--error-handling)

---

## 1. Overview

### Architecture Principle

Le TUI suit une architecture **unidirectionnelle** inspirée d'Elm/Redux :

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  stdin   │────▸│  input   │────▸│  state   │────▸│ renderer │────▸ stdout
│ (bytes)  │     │ (parser) │     │ (update) │     │ (buffer) │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                │                │
                      │           Action enum      Pure function
                      │          (no side effects)  state → string
                      │
                 Byte sequence
                 → semantic Action
```

**Règle cardinale** : aucun module ne fait d'I/O sauf `screen.mjs` (qui écrit le buffer) et `index.mjs` (qui orchestre le lifecycle). `state.mjs` et `renderer.mjs` sont des fonctions pures.

### Data Flow par frame

```
1. stdin 'data' event → raw bytes
2. input.parse(bytes) → Action | null
3. state.update(state, action) → newState  (pure, immutable)
4. renderer.render(newState) → string      (pure, builds full frame buffer)
5. screen.flush(string) → stdout.write()   (single atomic write)
```

---

## 2. File Structure

```
src/tui/
├── index.mjs       # Orchestrateur, lifecycle, point d'entrée
├── state.mjs       # State machine, reducers, état initial
├── renderer.mjs    # Rendu frame buffer (state → string)
├── input.mjs       # Parseur de touches, mapping séquences ANSI
├── screen.mjs      # Contrôle terminal bas-niveau, flush
└── ansi.mjs        # Constantes ANSI, helpers couleurs TUI
```

### Estimations de lignes par module

| Module         | Responsabilité                                  | Lignes estimées |
|----------------|------------------------------------------------|-----------------|
| `index.mjs`    | Lifecycle, wiring, signal handlers              | ~120            |
| `state.mjs`    | State shape, actions, reducers, helpers         | ~280            |
| `renderer.mjs` | Frame rendering, layout, columns, borders       | ~380            |
| `input.mjs`    | Keystroke parsing, escape sequence detection    | ~130            |
| `screen.mjs`   | Alt screen, raw mode, cursor, flush, resize     | ~100            |
| `ansi.mjs`     | ANSI constants, color wrappers, box drawing     | ~90             |
| **Total**      |                                                  | **~1100**       |

### Dépendances entre modules

```
index.mjs
 ├── state.mjs        (createInitialState, update)
 ├── renderer.mjs     (render)
 ├── input.mjs        (parseKey)
 ├── screen.mjs       (enter, exit, flush, onResize)
 ├── ../registry.mjs  (loadManifest, searchAgents, etc.)
 └── ../installer.mjs (installAgents)

state.mjs
 └── (aucune dépendance interne — pure logic)

renderer.mjs
 ├── ansi.mjs         (couleurs, box drawing)
 └── state.mjs        (types only — pour JSDoc)

input.mjs
 └── (aucune dépendance interne)

screen.mjs
 ├── ansi.mjs         (escape sequences)
 └── (process.stdout, process.stdin)

ansi.mjs
 └── (aucune dépendance)
```

---

## 3. Module Breakdown

### 3.1 `ansi.mjs` — ANSI Primitives

Fournit les constantes et fonctions de bas niveau pour le contrôle terminal. Étend les patterns de `display.mjs` mais spécialisé pour le TUI.

```javascript
// ─── Exports ────────────────────────────────────────────────────────────────

/** @type {boolean} */
export const NO_COLOR;  // process.env.NO_COLOR || process.env.TERM === 'dumb'

// ─── Escape Sequences (bruts) ───────────────────────────────────────────────

export const ESC = '\x1b[';

export const ALT_SCREEN_ON  = '\x1b[?1049h';
export const ALT_SCREEN_OFF = '\x1b[?1049l';
export const CURSOR_HIDE    = '\x1b[?25l';
export const CURSOR_SHOW    = '\x1b[?25h';
export const CLEAR_SCREEN   = '\x1b[2J';
export const CURSOR_HOME    = '\x1b[H';
export const CLEAR_LINE     = '\x1b[2K';

// ─── Cursor Movement ───────────────────────────────────────────────────────

/** @param {number} row - 1-based row */
/** @param {number} col - 1-based column */
export function moveTo(row, col);  // → '\x1b[{row};{col}H'

// ─── Color Wrappers ────────────────────────────────────────────────────────
// Respects NO_COLOR — returns text unchanged if NO_COLOR is set

export function bold(text);
export function dim(text);
export function inverse(text);      // '\x1b[7m' — pour ligne sélectionnée
export function red(text);
export function green(text);
export function yellow(text);
export function cyan(text);
export function boldCyan(text);
export function bgCyan(text);       // '\x1b[46m' — fond cyan pour surbrillance
export function bgWhite(text);      // '\x1b[47m'
export function white(text);

// ─── Box Drawing ────────────────────────────────────────────────────────────

export const BOX = {
  topLeft:     '┌',
  topRight:    '┐',
  bottomLeft:  '└',
  bottomRight: '┘',
  horizontal:  '─',
  vertical:    '│',
  teeRight:    '├',
  teeLeft:     '┤',
};

// ─── Utility ────────────────────────────────────────────────────────────────

/** Strip ANSI escape codes for measuring visible text width */
export function stripAnsi(text);   // → string
/** Visible character width (strip ANSI, handle emojis 2-width) */
export function visibleLength(text);  // → number
/** Pad string to fixed visible width */
export function padEnd(text, width);  // → string
/** Truncate string to max visible width, add '…' if truncated */
export function truncate(text, maxWidth);  // → string
```

#### Gestion des emojis

Les icônes de catégorie (`🤖`, `🔌`, `🗄️`, etc.) occupent **2 colonnes** dans le terminal. La fonction `visibleLength()` doit en tenir compte via une regex heuristique sur les caractères Unicode > U+1F000 ou utiliser `String.prototype.codePointAt()`.

```javascript
/**
 * Approximate visible width accounting for wide chars (CJK, emojis).
 * Emojis and CJK chars typically occupy 2 terminal columns.
 */
export function visibleLength(text) {
  const stripped = stripAnsi(text);
  let width = 0;
  for (const ch of stripped) {
    const cp = ch.codePointAt(0);
    // Emoji range (simplified heuristic)
    if (cp > 0x1F000 || (cp >= 0x2600 && cp <= 0x27BF) || (cp >= 0xFE00 && cp <= 0xFE0F)) {
      width += 2;
    } else if (cp >= 0x4E00 && cp <= 0x9FFF) {
      // CJK Unified Ideographs
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}
```

---

### 3.2 `screen.mjs` — Terminal Control Layer

Couche I/O exclusive. Seul module autorisé à interagir avec `process.stdin`/`process.stdout`.

```javascript
// ─── Exports ────────────────────────────────────────────────────────────────

/**
 * Enter TUI mode: alternate screen, raw mode, hide cursor.
 * MUST be called before any rendering.
 */
export function enter();

/**
 * Exit TUI mode: restore main screen, cooked mode, show cursor.
 * MUST be called on exit, even on crash.
 */
export function exit();

/**
 * Write a complete frame buffer to stdout in a single operation.
 * Moves cursor to home first, does NOT clear screen (overwrite strategy).
 * @param {string} buffer - Complete frame content
 */
export function flush(buffer);

/**
 * Get current terminal dimensions.
 * @returns {{ cols: number, rows: number }}
 */
export function getSize();

/**
 * Register a resize handler. Returns unsubscribe function.
 * @param {(size: {cols: number, rows: number}) => void} callback
 * @returns {() => void}
 */
export function onResize(callback);

/**
 * Register a stdin data handler. Returns unsubscribe function.
 * @param {(data: Buffer) => void} callback
 * @returns {() => void}
 */
export function onInput(callback);
```

#### Implémentation `enter()` / `exit()`

```javascript
export function enter() {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');
  process.stdout.write(ALT_SCREEN_ON + CURSOR_HIDE + CLEAR_SCREEN + CURSOR_HOME);
}

export function exit() {
  process.stdout.write(CURSOR_SHOW + ALT_SCREEN_OFF);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
}
```

#### Anti-flickering : stratégie d'écriture

```javascript
export function flush(buffer) {
  // Move cursor to top-left + write entire frame in one syscall
  process.stdout.write(CURSOR_HOME + buffer);
}
```

**Pourquoi pas `CLEAR_SCREEN` ?** Effacer puis réécrire cause un flash visible (un frame entièrement vide apparaît). En écrivant par-dessus avec `CURSOR_HOME`, chaque cellule est remplacée atomiquement. Les lignes restantes en fin d'écran sont effacées avec `CLEAR_LINE` par le renderer.

---

### 3.3 `input.mjs` — Keystroke Parser

Parse les bytes bruts de stdin en actions sémantiques.

```javascript
// ─── Action Types ───────────────────────────────────────────────────────────

/** @enum {string} */
export const Action = {
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
  TAB:         'TAB',           // Next tab
  SHIFT_TAB:   'SHIFT_TAB',    // Previous tab

  // Actions
  SELECT:      'SELECT',        // Space — toggle multi-select
  CONFIRM:     'CONFIRM',       // Enter — install / drill-down
  SEARCH:      'SEARCH',        // '/' — enter search mode
  ESCAPE:      'ESCAPE',        // Escape — cancel / back
  QUIT:        'QUIT',          // 'q' — quit TUI
  SELECT_ALL:  'SELECT_ALL',    // 'a' — toggle select all visible
  HELP:        'HELP',          // '?' — toggle help overlay

  // Search mode only
  BACKSPACE:   'BACKSPACE',
  DELETE_WORD: 'DELETE_WORD',   // Ctrl+W

  // Confirm mode
  YES:         'YES',           // 'y'
  NO:          'NO',            // 'n'

  // Character input (for search)
  CHAR:        'CHAR',          // Any printable char during search
};

/**
 * @typedef {{ action: string, char?: string }} ParsedKey
 */

/**
 * Parse a raw stdin data chunk into a semantic action.
 * @param {string} data - Raw character(s) from stdin
 * @param {string} mode - Current TUI mode ('browse' | 'search' | 'confirm' | ...)
 * @returns {ParsedKey | null}
 */
export function parseKey(data, mode);
```

#### Mapping des séquences ANSI

```javascript
// ─── Escape Sequence Map ────────────────────────────────────────────────────

const SEQUENCES = {
  '\x1b[A':   Action.UP,         // Arrow Up
  '\x1b[B':   Action.DOWN,       // Arrow Down
  '\x1b[C':   Action.RIGHT,      // Arrow Right
  '\x1b[D':   Action.LEFT,       // Arrow Left
  '\x1b[Z':   Action.SHIFT_TAB,  // Shift+Tab
  '\x1b[5~':  Action.PAGE_UP,    // Page Up
  '\x1b[6~':  Action.PAGE_DOWN,  // Page Down
  '\x1b[H':   Action.HOME,       // Home
  '\x1b[F':   Action.END,        // End
  '\x1bOH':   Action.HOME,       // Home (alt)
  '\x1bOF':   Action.END,        // End (alt)
  '\x1b[1~':  Action.HOME,       // Home (vt220)
  '\x1b[4~':  Action.END,        // End (vt220)
};

// ─── Single-byte Mappings ───────────────────────────────────────────────────

const CTRL_C = '\x03';    // → immediate exit
const TAB    = '\x09';    // → Action.TAB
const ENTER  = '\r';      // → Action.CONFIRM  (also handle '\n')
const SPACE  = ' ';       // → Action.SELECT
const ESC    = '\x1b';    // → Action.ESCAPE (when alone, not part of sequence)
const BACKSPACE_1 = '\x7f';  // → Action.BACKSPACE
const BACKSPACE_2 = '\x08';  // → Action.BACKSPACE
const CTRL_W = '\x17';    // → Action.DELETE_WORD
```

#### Distinction ESC isolé vs séquence escape

```javascript
export function parseKey(data, mode) {
  // Ctrl+C — always quit immediately
  if (data === CTRL_C) {
    return { action: Action.QUIT };
  }

  // Multi-char escape sequences (arrow keys, etc.)
  if (data.length > 1 && data[0] === ESC) {
    const action = SEQUENCES[data];
    if (action) return { action };
    return null;  // Unknown sequence — ignore
  }

  // Single ESC (no following chars in same data event)
  if (data === ESC) {
    return { action: Action.ESCAPE };
  }

  // Context-dependent mapping
  if (mode === 'search') {
    // In search mode, most keys are character input
    if (data === BACKSPACE_1 || data === BACKSPACE_2) return { action: Action.BACKSPACE };
    if (data === CTRL_W) return { action: Action.DELETE_WORD };
    if (data === ENTER || data === '\n') return { action: Action.CONFIRM };
    if (data === TAB) return { action: Action.TAB };
    // Printable character
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      return { action: Action.CHAR, char: data };
    }
    return null;
  }

  if (mode === 'confirm') {
    if (data === 'y' || data === 'Y') return { action: Action.YES };
    if (data === 'n' || data === 'N') return { action: Action.NO };
    if (data === ENTER || data === '\n') return { action: Action.YES };
    return null;
  }

  // Browse / pack_detail mode
  if (data === TAB) return { action: Action.TAB };
  if (data === SPACE) return { action: Action.SELECT };
  if (data === ENTER || data === '\n') return { action: Action.CONFIRM };
  if (data === '/') return { action: Action.SEARCH };
  if (data === 'q' || data === 'Q') return { action: Action.QUIT };
  if (data === 'a' || data === 'A') return { action: Action.SELECT_ALL };
  if (data === '?') return { action: Action.HELP };

  return null;
}
```

> **Note** : Node.js en raw mode envoie typiquement les séquences escape complètes dans un seul event `data`. La distinction entre ESC isolé et séquence est fiable car les émulateurs de terminal envoient `\x1b[A` (3 bytes) en un seul chunk, tandis qu'un appui sur la touche Escape envoie `\x1b` seul.

---

### 3.4 `state.mjs` — State Machine & Reducers

Cœur de la logique applicative. Entièrement pur — aucun side effect.

```javascript
// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * @typedef {'browse' | 'search' | 'confirm' | 'installing' | 'pack_detail' | 'done'} TuiMode
 */

/**
 * @typedef {{
 *   mode: TuiMode,
 *
 *   // Tab bar
 *   tabs: {
 *     ids: string[],           // ['all', 'ai', 'api', ..., 'packs']
 *     labels: string[],        // ['ALL(53)', 'AI(6)', 'API(2)', ..., 'Packs(9)']
 *     activeIndex: number,     // Index de l'onglet actif
 *   },
 *
 *   // Agent list (vue filtrée)
 *   list: {
 *     items: AgentEntry[],     // Agents filtrés selon tab + search
 *     cursor: number,          // Index du curseur dans items[]
 *     scrollOffset: number,    // Offset de scroll (première ligne visible)
 *   },
 *
 *   // Multi-sélection
 *   selection: Set<string>,    // Agent names sélectionnés
 *
 *   // Search
 *   search: {
 *     active: boolean,
 *     query: string,
 *   },
 *
 *   // Packs (quand onglet Packs actif)
 *   packs: {
 *     ids: string[],           // ['backend', 'frontend', ...]
 *     items: PackDef[],        // Pack definitions
 *   },
 *
 *   // Pack drill-down
 *   packDetail: {
 *     packId: string,
 *     packLabel: string,
 *     agents: AgentEntry[],
 *     cursor: number,
 *     scrollOffset: number,
 *   } | null,
 *
 *   // Installation
 *   install: {
 *     agents: AgentEntry[],     // Agents à installer
 *     current: number,          // Index courant
 *     results: Array<{ name: string, status: 'installed' | 'skipped' | 'failed' }>,
 *     done: boolean,
 *   } | null,
 *
 *   // Terminal
 *   terminal: {
 *     cols: number,
 *     rows: number,
 *   },
 *
 *   // Données source (immutables)
 *   manifest: Manifest,
 *   allAgents: AgentEntry[],
 * }} TuiState
 */

// ─── Exports ────────────────────────────────────────────────────────────────

/**
 * Create the initial state from a loaded manifest.
 * @param {Manifest} manifest
 * @param {{ cols: number, rows: number }} terminal
 * @returns {TuiState}
 */
export function createInitialState(manifest, terminal);

/**
 * Pure reducer: apply an action to produce a new state.
 * @param {TuiState} state
 * @param {{ action: string, char?: string }} parsed
 * @returns {TuiState}
 */
export function update(state, parsed);

/**
 * Recalculate list items based on current tab and search query.
 * Called internally by update, but also exported for resize recalculations.
 * @param {TuiState} state
 * @returns {AgentEntry[]}
 */
export function computeFilteredList(state);

/**
 * Get the viewport height (number of visible list rows).
 * @param {TuiState} state
 * @returns {number}
 */
export function getViewportHeight(state);
```

#### `createInitialState()`

```javascript
export function createInitialState(manifest, terminal) {
  const categoryIds = Object.keys(manifest.categories);
  const allAgents = [...manifest.agents]; // Shallow copy for safety
  const packIds = Object.keys(manifest.packs);

  // Build tab labels with counts
  const tabIds = ['all', ...categoryIds, 'packs'];
  const tabLabels = [
    `ALL(${allAgents.length})`,
    ...categoryIds.map(id => {
      const count = allAgents.filter(a => a.category === id).length;
      const shortLabel = manifest.categories[id].label.split(/[\s&]/)[0]; // First word
      return `${shortLabel}(${count})`;
    }),
    `Packs(${packIds.length})`,
  ];

  return {
    mode: 'browse',
    tabs: { ids: tabIds, labels: tabLabels, activeIndex: 0 },
    list: { items: allAgents, cursor: 0, scrollOffset: 0 },
    selection: new Set(),
    search: { active: false, query: '' },
    packs: {
      ids: packIds,
      items: packIds.map(id => ({ id, ...manifest.packs[id] })),
    },
    packDetail: null,
    install: null,
    terminal,
    manifest,
    allAgents,
  };
}
```

#### Reducer `update()` — Logique par mode

```javascript
export function update(state, { action, char }) {
  switch (state.mode) {
    case 'browse':      return updateBrowse(state, action, char);
    case 'search':      return updateSearch(state, action, char);
    case 'confirm':     return updateConfirm(state, action);
    case 'installing':  return state; // No user input during install
    case 'pack_detail': return updatePackDetail(state, action, char);
    case 'done':        return updateDone(state, action);
    default:            return state;
  }
}
```

##### `updateBrowse()`

```javascript
function updateBrowse(state, action) {
  switch (action) {
    case 'UP':
      return moveCursor(state, -1);

    case 'DOWN':
      return moveCursor(state, +1);

    case 'PAGE_UP':
      return moveCursor(state, -getViewportHeight(state));

    case 'PAGE_DOWN':
      return moveCursor(state, +getViewportHeight(state));

    case 'HOME':
      return moveCursorTo(state, 0);

    case 'END':
      return moveCursorTo(state, state.list.items.length - 1);

    case 'TAB':
    case 'RIGHT':
      return switchTab(state, +1);

    case 'SHIFT_TAB':
    case 'LEFT':
      return switchTab(state, -1);

    case 'SELECT':
      return toggleSelection(state);

    case 'SELECT_ALL':
      return toggleSelectAll(state);

    case 'CONFIRM':
      return handleConfirm(state);

    case 'SEARCH':
      return { ...state, mode: 'search', search: { active: true, query: '' } };

    case 'QUIT':
    case 'ESCAPE':
      return { ...state, mode: 'quit' }; // Signal to index.mjs to exit

    default:
      return state;
  }
}
```

##### `updateSearch()`

```javascript
function updateSearch(state, action, char) {
  switch (action) {
    case 'ESCAPE':
      // Cancel search, restore full list
      return refilter({ ...state, mode: 'browse', search: { active: false, query: '' } });

    case 'CONFIRM':
      // Accept search, stay on filtered results
      return { ...state, mode: 'browse', search: { ...state.search, active: false } };

    case 'BACKSPACE': {
      const newQuery = state.search.query.slice(0, -1);
      return refilter({ ...state, search: { ...state.search, query: newQuery } });
    }

    case 'DELETE_WORD': {
      // Delete last word (up to previous space or start)
      const q = state.search.query;
      const lastSpace = q.trimEnd().lastIndexOf(' ');
      const newQuery = lastSpace >= 0 ? q.slice(0, lastSpace + 1) : '';
      return refilter({ ...state, search: { ...state.search, query: newQuery } });
    }

    case 'CHAR': {
      const newQuery = state.search.query + char;
      return refilter({ ...state, search: { ...state.search, query: newQuery } });
    }

    default:
      return state;
  }
}
```

##### `handleConfirm()` — Logique contextuelle

```javascript
function handleConfirm(state) {
  const isPacksTab = state.tabs.ids[state.tabs.activeIndex] === 'packs';

  if (isPacksTab && !state.packDetail) {
    // Drill down into pack
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

  // Determine agents to install
  const agents = state.selection.size > 0
    ? state.allAgents.filter(a => state.selection.has(a.name))
    : state.list.items[state.list.cursor]
      ? [state.list.items[state.list.cursor]]
      : [];

  if (agents.length === 0) return state;

  return {
    ...state,
    mode: 'confirm',
    install: { agents, current: 0, results: [], done: false },
  };
}
```

#### Helper : `refilter()` — Recalcul de la liste filtrée

```javascript
/**
 * Recompute the filtered agent list and reset cursor/scroll.
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

export function computeFilteredList(state) {
  const tabId = state.tabs.ids[state.tabs.activeIndex];
  let agents;

  if (tabId === 'all') {
    agents = state.allAgents;
  } else if (tabId === 'packs') {
    // Packs tab shows pack list, not agent list (handled separately in renderer)
    return [];
  } else {
    agents = state.allAgents.filter(a => a.category === tabId);
  }

  // Apply search filter
  if (state.search.query) {
    const q = state.search.query.toLowerCase();
    agents = agents.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  return agents;
}
```

#### Helper : Déplacement du curseur avec scroll

```javascript
function moveCursor(state, delta) {
  const maxIndex = state.list.items.length - 1;
  if (maxIndex < 0) return state;

  const newCursor = Math.max(0, Math.min(maxIndex, state.list.cursor + delta));
  return adjustScroll({ ...state, list: { ...state.list, cursor: newCursor } });
}

function moveCursorTo(state, index) {
  const maxIndex = state.list.items.length - 1;
  if (maxIndex < 0) return state;
  const newCursor = Math.max(0, Math.min(maxIndex, index));
  return adjustScroll({ ...state, list: { ...state.list, cursor: newCursor } });
}

function adjustScroll(state) {
  const vh = getViewportHeight(state);
  let { cursor, scrollOffset } = state.list;

  // Cursor below visible area
  if (cursor >= scrollOffset + vh) {
    scrollOffset = cursor - vh + 1;
  }
  // Cursor above visible area
  if (cursor < scrollOffset) {
    scrollOffset = cursor;
  }

  return { ...state, list: { ...state.list, scrollOffset } };
}
```

---

### 3.5 `renderer.mjs` — Frame Buffer Builder

Fonction pure : prend l'état, retourne un string complet représentant l'écran.

```javascript
// ─── Exports ────────────────────────────────────────────────────────────────

/**
 * Render the complete frame from state.
 * @param {TuiState} state
 * @returns {string}
 */
export function render(state);
```

#### Constantes de layout

```javascript
// Chrome rows = rows consumed by non-list elements
const CHROME_ROWS = 8;
// ┌─ HEADER ─...─┐           row 1  (top border)
// │                │           row 2  (blank)
// │  [tabs...]     │           row 3  (tab bar)
// │                │           row 4  (blank)
// │  COLUMN HDRS   │           row 5  (column headers)
// │  ────────       │           row 6  (separator)
//    ... list ...              rows 7..N (viewport)
// │                │           row N+1 (blank or search bar)
// │  [shortcuts]   │           row N+2 (status bar)
// └────────────────┘           row N+3 (bottom border)

// Minimum terminal width for full layout
const MIN_COLS = 60;
// Minimum terminal height for usable viewport
const MIN_ROWS = 15;

// Column widths
const COL_ICON     = 4;   // "🤖 " (emoji + space)
const COL_CATEGORY = 10;  // "database  "
const COL_NAME     = 30;  // "expert-react-frontend-eng..."
const COL_GAP      = 2;   // spacing between columns
```

#### Structure de `render()`

```javascript
export function render(state) {
  const { cols, rows } = state.terminal;
  const innerWidth = cols - 4; // 2 chars border + 2 chars padding
  const lines = [];

  // ─── Top Border ─────────────────────────────────────────────
  lines.push(renderTopBorder(cols, state));

  // ─── Blank line ─────────────────────────────────────────────
  lines.push(renderBorderLine('', cols));

  // ─── Tab Bar ────────────────────────────────────────────────
  lines.push(renderBorderLine(renderTabBar(state), cols));

  // ─── Blank line ─────────────────────────────────────────────
  lines.push(renderBorderLine('', cols));

  // ─── Mode-specific content ──────────────────────────────────
  switch (state.mode) {
    case 'browse':
    case 'search':
      renderAgentList(state, lines, cols, rows);
      break;
    case 'confirm':
      renderConfirmDialog(state, lines, cols, rows);
      break;
    case 'installing':
      renderInstallProgress(state, lines, cols, rows);
      break;
    case 'pack_detail':
      renderPackDetail(state, lines, cols, rows);
      break;
    case 'done':
      renderInstallDone(state, lines, cols, rows);
      break;
  }

  // ─── Pad remaining rows with blank bordered lines ───────────
  while (lines.length < rows - 1) {
    lines.push(renderBorderLine('', cols));
  }

  // ─── Bottom Border ──────────────────────────────────────────
  lines.push(renderBottomBorder(cols));

  // ─── Clear any leftover lines from previous render ──────────
  // Add CLEAR_LINE to each line to overwrite previous content
  return lines.map(line => CLEAR_LINE + line).join('\n');
}
```

#### `renderTopBorder()`

```javascript
function renderTopBorder(cols, state) {
  const title = ' OPENCODE AGENTS ';
  const selCount = state.selection.size;
  const suffix = selCount > 0 ? ` ${selCount} selected ` : '';

  const titlePart = BOX.topLeft + BOX.horizontal + bold(title);
  const suffixPart = suffix ? dim(suffix) + BOX.horizontal : '';
  const remaining = cols - visibleLength(titlePart) - visibleLength(suffixPart) - 1;
  const fill = BOX.horizontal.repeat(Math.max(0, remaining));

  return titlePart + fill + suffixPart + BOX.topRight;
}
```

#### `renderTabBar()`

```javascript
function renderTabBar(state) {
  const { tabs } = state;
  let bar = ' ';

  for (let i = 0; i < tabs.ids.length; i++) {
    const label = tabs.labels[i];
    if (i === tabs.activeIndex) {
      bar += inverse(`[${label}]`);
    } else {
      bar += dim(label);
    }
    bar += ' ';
  }

  return bar;
}
```

#### `renderAgentList()` — Vue principale

```javascript
function renderAgentList(state, lines, cols, rows) {
  const innerWidth = cols - 4;
  const isPacksTab = state.tabs.ids[state.tabs.activeIndex] === 'packs';

  if (isPacksTab) {
    renderPacksList(state, lines, cols, rows);
    return;
  }

  // ─── Column Headers ────────────────────────────────────────
  const headerLine = '  ' +
    padEnd(dim('CATEGORY'), COL_CATEGORY + COL_ICON) +
    padEnd(dim('NAME'), COL_NAME) +
    dim('DESCRIPTION');
  lines.push(renderBorderLine(headerLine, cols));

  const sepLine = '  ' +
    padEnd(dim('─'.repeat(COL_CATEGORY)), COL_CATEGORY + COL_ICON) +
    padEnd(dim('─'.repeat(COL_NAME - 2)), COL_NAME) +
    dim('─'.repeat(Math.min(20, innerWidth - COL_CATEGORY - COL_ICON - COL_NAME)));
  lines.push(renderBorderLine(sepLine, cols));

  // ─── List Viewport ─────────────────────────────────────────
  const vh = getViewportHeight(state);
  const { items, cursor, scrollOffset } = state.list;
  const descWidth = Math.max(10, innerWidth - COL_ICON - COL_CATEGORY - COL_NAME - 4);

  for (let i = 0; i < vh; i++) {
    const idx = scrollOffset + i;
    if (idx >= items.length) {
      lines.push(renderBorderLine('', cols));
      continue;
    }

    const agent = items[idx];
    const isSelected = state.selection.has(agent.name);
    const isCursor = idx === cursor;

    // Build row
    const check = isSelected ? green('✓') : ' ';
    const pointer = isCursor ? boldCyan('▸') : ' ';
    const icon = CATEGORY_ICONS[agent.category] || '📦';
    const cat = padEnd(dim(agent.category), COL_CATEGORY);
    const name = padEnd(agent.name, COL_NAME);
    const desc = truncate(agent.description, descWidth);

    let row = ` ${check}${pointer} ${icon} ${cat}${name}${dim(desc)}`;

    if (isCursor) {
      row = inverse(row); // Full-row highlight
    }

    lines.push(renderBorderLine(row, cols));
  }

  // ─── Scroll Indicator ──────────────────────────────────────
  if (items.length > vh) {
    const pct = Math.round((scrollOffset / Math.max(1, items.length - vh)) * 100);
    const scrollInfo = dim(` ${scrollOffset + 1}-${Math.min(scrollOffset + vh, items.length)} of ${items.length} (${pct}%)`);
    lines.push(renderBorderLine(scrollInfo, cols));
  } else {
    lines.push(renderBorderLine('', cols));
  }

  // ─── Search Bar (if active) ────────────────────────────────
  if (state.search.active) {
    const searchBar = ` ${boldCyan('/')} ${state.search.query}${inverse(' ')}`;  // Faux cursor
    lines.push(renderBorderLine(searchBar, cols));
  } else {
    lines.push(renderBorderLine('', cols));
  }

  // ─── Status Bar ────────────────────────────────────────────
  const shortcuts = state.search.active
    ? ` ${dim('[Esc]')} Cancel  ${dim('[Enter]')} Apply`
    : ` ${dim('[/]')} Search  ${dim('[Space]')} Select  ${dim('[Enter]')} Install  ${dim('[Tab]')} Next tab  ${dim('[q]')} Quit`;
  lines.push(renderBorderLine(shortcuts, cols));
}
```

#### `renderBorderLine()` — Encadrement avec bordures

```javascript
/**
 * Wrap content in left/right box borders, padded to full width.
 * @param {string} content - Inner content (may contain ANSI codes)
 * @param {number} totalCols - Terminal width
 */
function renderBorderLine(content, totalCols) {
  const contentWidth = visibleLength(content);
  const innerWidth = totalCols - 4; // │ + space + ... + space + │
  const padding = Math.max(0, innerWidth - contentWidth);
  return `${BOX.vertical} ${content}${' '.repeat(padding)} ${BOX.vertical}`;
}
```

---

### 3.6 `index.mjs` — Orchestrator

Point d'entrée unique du TUI. Gère le lifecycle et le wiring.

```javascript
import { loadManifest } from '../registry.mjs';
import { installAgents } from '../installer.mjs';
import { createInitialState, update } from './state.mjs';
import { render } from './renderer.mjs';
import { parseKey } from './input.mjs';
import { enter, exit, flush, getSize, onResize, onInput } from './screen.mjs';

/**
 * Launch the interactive TUI.
 * Resolves when the user quits.
 * @param {object} [options]
 * @param {boolean} [options.force] - Overwrite existing files
 * @returns {Promise<void>}
 */
export async function launchTUI(options = {}) {
  // ─── Guard: TTY required ────────────────────────────────────
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    throw new Error('Interactive mode requires a TTY terminal.');
  }

  // ─── Load data ──────────────────────────────────────────────
  const manifest = loadManifest();

  // ─── Initialize ─────────────────────────────────────────────
  let state = createInitialState(manifest, getSize());
  enter();

  // ─── Render function ────────────────────────────────────────
  function redraw() {
    const buffer = render(state);
    flush(buffer);
  }

  // ─── Cleanup ────────────────────────────────────────────────
  function cleanup() {
    unsubInput();
    unsubResize();
    exit();
  }

  // ─── Signal handlers ────────────────────────────────────────
  const onSigInt = () => { cleanup(); process.exit(0); };
  const onSigTerm = () => { cleanup(); process.exit(0); };
  process.on('SIGINT', onSigInt);
  process.on('SIGTERM', onSigTerm);

  // ─── Resize handler ────────────────────────────────────────
  const unsubResize = onResize((size) => {
    state = { ...state, terminal: size };
    redraw();
  });

  // ─── Main loop via Promise ──────────────────────────────────
  return new Promise((resolve) => {
    const unsubInput = onInput(async (data) => {
      const parsed = parseKey(data, state.mode);
      if (!parsed) return;

      // Quit action
      if (parsed.action === 'QUIT' || state.mode === 'quit') {
        cleanup();
        process.off('SIGINT', onSigInt);
        process.off('SIGTERM', onSigTerm);
        resolve();
        return;
      }

      // State transition
      const newState = update(state, parsed);

      // Side effects (install action)
      if (newState.mode === 'installing' && state.mode !== 'installing') {
        state = newState;
        redraw();
        await performInstall(state, options, (updatedInstall) => {
          state = { ...state, install: updatedInstall };
          redraw();
        });
        state = { ...state, mode: 'done' };
        redraw();
        return;
      }

      state = newState;
      redraw();
    });

    // ─── Initial render ───────────────────────────────────────
    redraw();
  });
}

/**
 * Perform the actual installation with progress updates.
 * @param {TuiState} state
 * @param {object} options
 * @param {(install: object) => void} onProgress
 */
async function performInstall(state, options, onProgress) {
  const agents = state.install.agents;
  const results = [];

  for (let i = 0; i < agents.length; i++) {
    onProgress({
      ...state.install,
      current: i,
      results: [...results],
      done: false,
    });

    // Install one agent at a time so we can show progress
    const result = await installAgents([agents[i]], {
      force: options.force,
      // Suppress console output — we render our own UI
      // Note: installAgents() uses console.log via display.mjs
      // We need to intercept or suppress these during TUI mode
    });

    results.push({
      name: agents[i].name,
      status: result.failed > 0 ? 'failed' : result.skipped > 0 ? 'skipped' : 'installed',
    });
  }

  onProgress({
    ...state.install,
    current: agents.length,
    results,
    done: true,
  });
}
```

> **Note sur la suppression du console.log** : `installAgents()` utilise `display.mjs` qui fait `console.log()`. En mode TUI, cela corromprait l'affichage. Solution : rediriger temporairement `console.log` et `console.error` pendant l'installation :

```javascript
function withSilentConsole(fn) {
  const origLog = console.log;
  const origErr = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}
```

---

## 4. State Machine

### Diagramme d'états complet

```
                          ┌──────────────────────────────────────────────┐
                          │                                              │
                          ▼                                              │
                    ┌──────────┐                                         │
        ┌──────────│  BROWSE   │──────────────────────┐                  │
        │          └──────────┘                       │                  │
        │            │  │   │                         │                  │
        │     '/'    │  │   │  Enter                  │  q / Esc         │
        │            │  │   │  (agent)                │                  │
        │            ▼  │   ▼                         ▼                  │
        │     ┌──────────┐ ┌──────────┐        ┌──────────┐              │
        │     │  SEARCH  │ │ CONFIRM  │        │   QUIT   │              │
        │     └──────────┘ └──────────┘        └──────────┘              │
        │       │    │        │     │                                     │
        │  Esc  │    │Enter   │ y   │ n/Esc                              │
        │       │    │        │     │                                     │
        │       ▼    ▼        ▼     └──────────────────┐                 │
        │     BROWSE      ┌────────────┐               │                 │
        │                 │ INSTALLING │               │                 │
        │                 └────────────┘               │                 │
        │                      │                       │                 │
        │                 completion                   │                 │
        │                      │                       │                 │
        │                      ▼                       │                 │
        │                 ┌──────────┐                 │                 │
        │                 │   DONE   │─── any key ─────┼─────────────────┘
        │                 └──────────┘                 │
        │                                              │
        │    Enter (on Packs tab)                      │
        │            ┌──────────────┐                  │
        └───────────▸│ PACK_DETAIL  │──── Esc ─────────┘
                     └──────────────┘
                       │         │
                  Space│    Enter│
                  (select)  (install → CONFIRM)
```

### Transitions détaillées

| État source   | Action          | Condition                    | État cible    | Side effect                    |
|---------------|-----------------|------------------------------|---------------|--------------------------------|
| `browse`      | `/`             |                              | `search`      | Focus search input             |
| `browse`      | `↑↓`           |                              | `browse`      | Move cursor                    |
| `browse`      | `←→`/`Tab`     |                              | `browse`      | Switch tab + refilter          |
| `browse`      | `Space`         |                              | `browse`      | Toggle selection               |
| `browse`      | `Enter`         | Tab ≠ packs, items > 0       | `confirm`     | Prepare install list           |
| `browse`      | `Enter`         | Tab = packs                  | `pack_detail` | Load pack agents               |
| `browse`      | `q`/`Esc`       |                              | (exit)        | Cleanup + resolve              |
| `search`      | `Esc`           |                              | `browse`      | Clear query, refilter          |
| `search`      | `Enter`         |                              | `browse`      | Keep filter applied            |
| `search`      | printable char  |                              | `search`      | Append to query, refilter      |
| `search`      | `Backspace`     |                              | `search`      | Remove last char, refilter     |
| `confirm`     | `y`/`Enter`     |                              | `installing`  | Start install sequence         |
| `confirm`     | `n`/`Esc`       |                              | `browse`      | Cancel                         |
| `installing`  | (auto)          | All agents processed         | `done`        | Show summary                   |
| `done`        | any key         |                              | `browse`      | Reset install, clear selection |
| `pack_detail` | `↑↓`           |                              | `pack_detail` | Move cursor in pack agents     |
| `pack_detail` | `Space`         |                              | `pack_detail` | Toggle agent selection         |
| `pack_detail` | `Enter`         | Selection > 0                | `confirm`     | Confirm install                |
| `pack_detail` | `Esc`           |                              | `browse`      | Back to packs tab              |

---

## 5. Render Pipeline

### Frame Construction

```
     ┌─────────────────────────────────────────────────┐
     │ 1. render(state)                                │
     │    ├── renderTopBorder()                        │
     │    ├── renderTabBar()                           │
     │    ├── switch(state.mode)                       │
     │    │   ├── browse → renderAgentList()           │
     │    │   ├── search → renderAgentList() + input   │
     │    │   ├── confirm → renderConfirmDialog()      │
     │    │   ├── installing → renderProgress()        │
     │    │   ├── pack_detail → renderPackDetail()     │
     │    │   └── done → renderSummary()               │
     │    ├── renderStatusBar()                        │
     │    └── renderBottomBorder()                     │
     │                                                 │
     │ 2. lines[] → join('\n')                         │
     │    + CLEAR_LINE prefix on each line             │
     │                                                 │
     │ 3. flush(buffer)                                │
     │    = CURSOR_HOME + buffer → stdout.write()      │
     └─────────────────────────────────────────────────┘
```

### Anti-flickering Protocol

1. **Jamais de `CLEAR_SCREEN`** sauf au tout premier render (dans `enter()`)
2. Chaque ligne est préfixée par `\x1b[2K` (CLEAR_LINE) pour effacer les résidus
3. Le buffer complet est écrit en **un seul appel** `process.stdout.write()`
4. Le curseur est caché en permanence (`CURSOR_HIDE`)
5. Toutes les lignes sont padded à la largeur du terminal (pas de lignes courtes)

### Gestion du resize

```javascript
process.stdout.on('resize', () => {
  const size = { cols: process.stdout.columns, rows: process.stdout.rows };
  state = { ...state, terminal: size };
  // Recalculate viewport, adjust scroll
  state = adjustScroll(state);
  redraw();
});
```

Le resize recalcule :
- `getViewportHeight()` (dépend de `rows`)
- Largeur des colonnes (dépend de `cols`)
- `scrollOffset` (s'assurer que le cursor reste visible)
- Troncature des descriptions

### Terminal trop petit

Si `cols < MIN_COLS` ou `rows < MIN_ROWS`, afficher un message d'avertissement au lieu du TUI complet :

```
┌──────────────────────┐
│                      │
│  Terminal too small.  │
│  Min: 60x15          │
│  Current: 45x12      │
│                      │
│  Resize to continue. │
│                      │
└──────────────────────┘
```

---

## 6. Input Handling

### Séquences escape ANSI complètes

| Touche       | Bytes (hex)              | Bytes (string)  | Action       |
|-------------|--------------------------|-----------------|-------------|
| Arrow Up     | `1b 5b 41`               | `\x1b[A`        | UP          |
| Arrow Down   | `1b 5b 42`               | `\x1b[B`        | DOWN        |
| Arrow Right  | `1b 5b 43`               | `\x1b[C`        | RIGHT       |
| Arrow Left   | `1b 5b 44`               | `\x1b[D`        | LEFT        |
| Page Up      | `1b 5b 35 7e`            | `\x1b[5~`       | PAGE_UP     |
| Page Down    | `1b 5b 36 7e`            | `\x1b[6~`       | PAGE_DOWN   |
| Home         | `1b 5b 48` / `1b 4f 48`  | `\x1b[H`        | HOME        |
| End          | `1b 5b 46` / `1b 4f 46`  | `\x1b[F`        | END         |
| Tab          | `09`                     | `\t`            | TAB         |
| Shift+Tab    | `1b 5b 5a`               | `\x1b[Z`        | SHIFT_TAB   |
| Enter        | `0d`                     | `\r`            | CONFIRM     |
| Space        | `20`                     | ` `             | SELECT      |
| Escape       | `1b` (seul)              | `\x1b`          | ESCAPE      |
| Backspace    | `7f` / `08`              | `\x7f`          | BACKSPACE   |
| Ctrl+C       | `03`                     | `\x03`          | (exit)      |
| Ctrl+W       | `17`                     | `\x17`          | DELETE_WORD |

### Input contextualisé par mode

Le parseur reçoit le `mode` courant pour interpréter les touches différemment :

- **browse** : `q` = QUIT, `Space` = SELECT, `/` = SEARCH
- **search** : `q` = CHAR('q'), `Space` = CHAR(' '), toute touche printable = CHAR
- **confirm** : seuls `y`/`n`/`Enter`/`Esc` sont acceptés
- **installing** : aucune touche acceptée (sauf Ctrl+C global)
- **done** : toute touche = retour à browse

---

## 7. Scroll Management

### Viewport Calculation

```javascript
export function getViewportHeight(state) {
  //   total rows
  // - 1 top border
  // - 1 blank after border
  // - 1 tab bar
  // - 1 blank after tabs
  // - 1 column headers
  // - 1 separator line
  // - 1 scroll indicator / blank
  // - 1 search bar / blank
  // - 1 status bar
  // - 1 bottom border
  // ─────────
  // = 10 chrome rows
  const CHROME_ROWS = 10;
  return Math.max(1, state.terminal.rows - CHROME_ROWS);
}
```

### Scroll Strategy : "Follow Cursor"

```
     scrollOffset = 0
     ┌──────────────────────────────┐
  0  │ ▸ agent-1 (cursor)          │ ←─ visible
  1  │   agent-2                   │
  2  │   agent-3                   │
  3  │   agent-4                   │
  4  │   agent-5                   │ ←─ viewport height = 5
     └──────────────────────────────┘
  5     agent-6                       ←─ hidden
  6     agent-7
  ...
```

Quand le curseur descend sous le viewport :

```
     scrollOffset = 2
     ┌──────────────────────────────┐
  2  │   agent-3                   │
  3  │   agent-4                   │
  4  │   agent-5                   │
  5  │   agent-6                   │
  6  │ ▸ agent-7 (cursor)          │ ←─ cursor at bottom
     └──────────────────────────────┘
```

### Scroll Indicator

Affiché uniquement quand `items.length > viewportHeight` :

```
   2-6 of 53 (8%)       ← informations de position
```

### Page Up / Page Down

```javascript
case 'PAGE_UP':   return moveCursor(state, -viewportHeight);
case 'PAGE_DOWN': return moveCursor(state, +viewportHeight);
```

Le `moveCursor()` clamp automatiquement entre 0 et `items.length - 1`.

---

## 8. Tab Navigation

### Structure des onglets

```javascript
tabs: {
  ids:    ['all', 'ai', 'api', 'business', 'database', 'devops',
           'devtools', 'docs', 'languages', 'mcp', 'security',
           'team', 'web', 'packs'],
  labels: ['ALL(53)', 'AI(6)', 'API(2)', 'Biz(3)', 'DB(3)', 'DevOps(8)',
           'DevTools(5)', 'Docs(3)', 'Lang(10)', 'MCP(3)', 'Sec(3)',
           'Team(5)', 'Web(2)', 'Packs(9)'],
  activeIndex: 0,
}
```

### Navigation circulaire

```javascript
function switchTab(state, direction) {
  const count = state.tabs.ids.length;
  const newIndex = (state.tabs.activeIndex + direction + count) % count;

  // Rebuild filtered list for new tab
  const newState = {
    ...state,
    tabs: { ...state.tabs, activeIndex: newIndex },
    packDetail: null, // Clear drill-down on tab switch
  };

  return refilter({
    ...newState,
    list: { ...newState.list, cursor: 0, scrollOffset: 0 },
    search: { active: false, query: '' }, // Clear search on tab switch
  });
}
```

- `Tab` / `→` : onglet suivant (wraps `packs` → `all`)
- `Shift+Tab` / `←` : onglet précédent (wraps `all` → `packs`)
- Le changement de tab remet le cursor à 0 et efface la recherche
- L'onglet `packs` affiche un layout différent (voir §11)

### Rendu du tab bar

L'onglet actif est affiché en **vidéo inverse** : `[ALL(53)]`. Les autres en `dim`.

Si le terminal est trop étroit pour afficher tous les tabs, les tabs overflow-ent avec un indicateur `◀ ▸` :

```javascript
function renderTabBar(state) {
  const { tabs, terminal } = state;
  const maxWidth = terminal.cols - 6; // Borders + padding

  // Calculate total width of all tabs
  let totalWidth = 0;
  const tabStrings = tabs.labels.map((label, i) => {
    const str = i === tabs.activeIndex ? `[${label}]` : label;
    totalWidth += str.length + 1; // +1 for spacing
    return str;
  });

  // If fits, render all
  if (totalWidth <= maxWidth) {
    return ' ' + tabStrings.map((str, i) =>
      i === tabs.activeIndex ? inverse(str) : dim(str)
    ).join(' ');
  }

  // Scroll tabs to keep active visible
  // ... (center active tab in available width)
}
```

---

## 9. Search Mode

### Entrée en mode recherche

Touche `/` en mode `browse` → transition vers `search` :

```javascript
// Dans updateBrowse:
case 'SEARCH':
  return {
    ...state,
    mode: 'search',
    search: { active: true, query: '' },
  };
```

### Affichage du champ de recherche

Le champ de recherche remplace la ligne vide sous la liste :

```
│  [shortcuts...]                                              │  ← status bar
│  / typescript█                                               │  ← search bar
└──────────────────────────────────────────────────────────────┘
```

Le `█` est un faux curseur rendu avec `inverse(' ')`.

### Filtrage incrémental

À chaque caractère tapé :

1. `state.search.query` est mis à jour
2. `refilter()` est appelé : filtre `allAgents` par le query
3. `cursor` est réinitialisé à 0 si les résultats changent
4. La liste se met à jour immédiatement

```javascript
case 'CHAR': {
  const newQuery = state.search.query + char;
  return refilter({
    ...state,
    search: { ...state.search, query: newQuery },
  });
}
```

### Algorithme de filtrage

Utilise la même logique que `searchAgents()` de `registry.mjs`, mais appliquée côté state pour éviter un re-parse du manifest :

```javascript
// Dans computeFilteredList:
if (state.search.query) {
  const q = state.search.query.toLowerCase();
  agents = agents.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.description.toLowerCase().includes(q) ||
    a.category.toLowerCase().includes(q) ||
    a.tags.some(t => t.toLowerCase().includes(q))
  );
}
```

Le filtre s'applique **en combinaison** avec le tab actif. Par exemple, si l'onglet "AI" est actif et la recherche est "prod", seuls les agents AI contenant "prod" sont affichés.

### Sortie du mode recherche

| Touche  | Effet                                          |
|---------|------------------------------------------------|
| `Esc`   | Annule la recherche, restaure la liste complète |
| `Enter` | Valide la recherche, reste sur les résultats filtrés |

Après `Enter`, le mode redevient `browse` mais `search.query` est conservé. L'utilisateur voit les résultats filtrés et peut naviguer/sélectionner. Pour effacer le filtre, il suffit de changer de tab ou de relancer `/` et effacer.

### Indicateur visuel de filtre actif

Quand `search.query` est non-vide en mode `browse` (après Enter), afficher dans le status bar :

```
│  Filter: "typescript" (10 results)  [/] Search  [Esc] Clear  ...       │
```

---

## 10. Multi-Select

### Tracking

```javascript
selection: new Set<string>()  // Set de noms d'agents
```

La sélection est **globale** (persiste entre tabs et recherches). Un agent sélectionné reste sélectionné même si on change de tab.

### Toggle individuel (Space)

```javascript
function toggleSelection(state) {
  const agent = state.list.items[state.list.cursor];
  if (!agent) return state;

  const newSelection = new Set(state.selection);
  if (newSelection.has(agent.name)) {
    newSelection.delete(agent.name);
  } else {
    newSelection.add(agent.name);
  }

  // Move cursor down after selection (like file managers)
  return moveCursor({ ...state, selection: newSelection }, +1);
}
```

### Select All / Deselect All (`a`)

```javascript
function toggleSelectAll(state) {
  const visibleNames = state.list.items.map(a => a.name);
  const allSelected = visibleNames.every(n => state.selection.has(n));

  const newSelection = new Set(state.selection);
  if (allSelected) {
    // Deselect all visible
    visibleNames.forEach(n => newSelection.delete(n));
  } else {
    // Select all visible
    visibleNames.forEach(n => newSelection.add(n));
  }

  return { ...state, selection: newSelection };
}
```

### Indicateur visuel

```
│ ✓▸ 🤖 ai      ai-engineer          End-to-end AI systems...  │  ← selected + cursor
│ ✓  🤖 ai      data-scientist        Data patterns, predict... │  ← selected
│    🤖 ai      llm-architect         LLM systems for produ...  │  ← not selected
```

- `✓` vert avant le pointeur si sélectionné
- Espace sinon
- Le compteur de sélection s'affiche dans le titre : `┌─ OPENCODE AGENTS ── 3 selected ─┐`

### Action d'installation

Quand `Enter` est pressé :

- **Si `selection.size > 0`** : propose d'installer tous les agents sélectionnés
- **Si `selection.size === 0`** : propose d'installer uniquement l'agent sous le curseur

---

## 11. Pack Drill-Down

### Vue Packs (onglet Packs)

Quand l'onglet Packs est actif, le renderer affiche la liste des packs au lieu des agents :

```
│                                                                      │
│  PACK              AGENTS  DESCRIPTION                               │
│  ────              ──────  ───────────                               │
│ ▸ backend          8       Core agents for backend development        │
│   frontend         6       Everything you need for modern frontend... │
│   devops           8       Complete DevOps and infrastructure agents  │
│   fullstack        9       End-to-end development from database to... │
│   ai               6       All AI and machine learning agents         │
│   security         3       Comprehensive security auditing agents     │
│   mcp              3       Complete MCP server development toolkit    │
│   quality          5       Code quality, testing, and performance...  │
│   startup          8       Essential agents for a lean startup team   │
│                                                                      │
```

### Drill-down (Enter sur un pack)

Passe en mode `pack_detail` :

```
│                                                                      │
│  ◀ Back to Packs  │  Pack: Backend Essentials (8 agents)             │
│                                                                      │
│  NAME                        DESCRIPTION                              │
│  ────                        ───────────                              │
│ ✓▸ postgres-pro              PostgreSQL performance optimization...    │
│ ✓  redis-specialist          Redis caching, data structures, pub/...  │
│    database-architect         Database design, data modeling, scal...  │
│    api-architect              REST API architecture, design patter... │
│    python-pro                 Type-safe Python for web APIs, async... │
│    typescript-pro             Advanced TypeScript type system, gen... │
│    debugger                   Bug diagnosis, root cause analysis...   │
│    test-automator             Automated test frameworks, test scri... │
│                                                                      │
│  [Space] Select  [a] Select all  [Enter] Install selected  [Esc] Back│
│                                                                      │
```

Les sélections dans le pack drill-down alimentent le même `selection` global.

`Escape` retourne à la vue Packs sans effacer les sélections.

---

## 12. Installation Flow

### Dialogue de confirmation

Mode `confirm` :

```
│                                                                      │
│                                                                      │
│     ┌─ Confirm Installation ──────────────────────────────────────┐   │
│     │                                                             │   │
│     │  Install 3 agent(s)?                                        │   │
│     │                                                             │   │
│     │    • postgres-pro                                           │   │
│     │    • redis-specialist                                       │   │
│     │    • api-architect                                          │   │
│     │                                                             │   │
│     │  Options: --force (overwrite existing)                      │   │
│     │                                                             │   │
│     │              [y] Yes    [n] No                               │   │
│     │                                                             │   │
│     └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
```

Si plus de 8 agents, tronquer avec `... and 12 more`.

### Progression de l'installation

Mode `installing` :

```
│                                                                      │
│  Installing 3 agents...                                              │
│                                                                      │
│  ✓ postgres-pro               → .opencode/agents/database/postgr... │
│  ✓ redis-specialist            → .opencode/agents/database/redis-... │
│  ⠋ api-architect              Installing...                          │
│                                                                      │
│  [2/3] ████████████████████░░░░░░░░░░ 67%                           │
│                                                                      │
```

Spinner frames pour l'agent en cours : `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` (Braille spinner, rotation toutes les 80ms).

### Barre de progression

```javascript
function renderProgressBar(current, total, width) {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  return green('█'.repeat(filled)) + dim('░'.repeat(empty));
}
```

### Résumé (mode `done`)

```
│                                                                      │
│  ┌─ Installation Complete ────────────────────────────────────────┐   │
│  │                                                                │   │
│  │  ✓ 2 installed    ⚠ 1 skipped    ✗ 0 failed                  │   │
│  │                                                                │   │
│  │  ✓ postgres-pro           → .opencode/agents/database/...     │   │
│  │  ✓ redis-specialist        → .opencode/agents/database/...     │   │
│  │  ⚠ api-architect          (already exists, use --force)       │   │
│  │                                                                │   │
│  │                  Press any key to continue                     │   │
│  │                                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                      │
```

### Suppression de console.log pendant l'installation

`installAgents()` de `installer.mjs` utilise `display.mjs` qui écrit sur `console.log`. En mode TUI, on redirige :

```javascript
async function performInstall(state, options, onProgress) {
  const origLog = console.log;
  const origErr = console.error;

  try {
    console.log = () => {};
    console.error = () => {};

    for (let i = 0; i < state.install.agents.length; i++) {
      // ... install logic with onProgress callback
    }
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}
```

---

## 13. Integration Point

### Modification de `bin/cli.mjs`

Le TUI est lancé de deux manières :

1. **`opencode-agents`** (sans arguments, en TTY) → lance le TUI
2. **`opencode-agents browse`** → lance explicitement le TUI

```javascript
// ─── Dans main() de cli.mjs ─────────────────────────────────────────

// ─── Import dynamique (lazy load TUI seulement si nécessaire) ───────
async function launchInteractive(parsed) {
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    // Not a TTY — fallback to help
    showHelp();
    return;
  }

  const { launchTUI } = await import('../src/tui/index.mjs');
  await launchTUI({
    force: Boolean(parsed.flags.force),
  });
}

// ─── Router ─────────────────────────────────────────────────────────

switch (parsed.command) {
  case 'install':
  case 'i':
  case 'add':
    await cmdInstall(parsed);
    break;

  case 'list':
  case 'ls':
    cmdList(parsed);
    break;

  case 'search':
  case 'find':
    cmdSearch(parsed);
    break;

  case 'browse':
  case 'ui':
    await launchInteractive(parsed);
    break;

  case '':
    // No command — launch TUI if TTY, otherwise show help
    if (process.stdout.isTTY && process.stdin.isTTY) {
      await launchInteractive(parsed);
    } else {
      showHelp();
    }
    break;

  default:
    errorMessage(`Unknown command "${parsed.command}".`);
    process.exit(1);
}
```

### Avantages de l'import dynamique

- Le TUI n'est chargé que quand nécessaire (pas de surcharge pour `install`, `list`, `search`)
- Pas d'impact sur les tests existants (qui n'utilisent pas de TTY)
- Le module `src/tui/` peut être supprimé sans casser les commandes non-interactives

---

## 14. ANSI Escape Sequences Reference

### Séquences utilisées par le TUI

```
Cursor Control
──────────────
\x1b[H          Move cursor to home (1,1)
\x1b[{r};{c}H  Move cursor to row r, column c
\x1b[?25h      Show cursor
\x1b[?25l      Hide cursor

Screen Control
──────────────
\x1b[?1049h    Switch to alternate screen buffer
\x1b[?1049l    Switch back to main screen buffer
\x1b[2J        Clear entire screen
\x1b[2K        Clear entire current line

Text Styling
────────────
\x1b[0m        Reset all styles
\x1b[1m        Bold
\x1b[2m        Dim
\x1b[3m        Italic
\x1b[7m        Inverse (reverse video)
\x1b[31m       Red foreground
\x1b[32m       Green foreground
\x1b[33m       Yellow foreground
\x1b[36m       Cyan foreground
\x1b[46m       Cyan background
\x1b[47m       White background

Box Drawing (Unicode)
─────────────────────
┌  U+250C  Box Drawings Light Down and Right
┐  U+2510  Box Drawings Light Down and Left
└  U+2514  Box Drawings Light Up and Right
┘  U+2518  Box Drawings Light Up and Left
│  U+2502  Box Drawings Light Vertical
─  U+2500  Box Drawings Light Horizontal
├  U+251C  Box Drawings Light Vertical and Right
┤  U+2524  Box Drawings Light Vertical and Left
```

### Compatibilité terminale

Ces séquences sont supportées par :
- **macOS** : Terminal.app, iTerm2, Alacritty, WezTerm, Kitty
- **Linux** : GNOME Terminal, Konsole, Alacritty, foot, st
- **Windows** : Windows Terminal, ConEmu, Git Bash (via mintty)
- **CI/CD** : les tests n'invoquent pas le TUI (guard `isTTY`)

---

## 15. Edge Cases & Error Handling

### Terminal non-TTY

```javascript
if (!process.stdout.isTTY || !process.stdin.isTTY) {
  // Pipe / redirection — fallback to non-interactive help
  showHelp();
  return;
}
```

### Ctrl+C pendant l'installation

Le handler `SIGINT` appelle `cleanup()` qui restaure l'écran normal **avant** `process.exit()`. L'installation partielle est laissée en l'état (fichiers déjà écrits restent sur disque).

```javascript
process.on('SIGINT', () => {
  cleanup();
  process.exit(130); // Convention Unix: 128 + signal number (2 for SIGINT)
});
```

### Manifest vide ou corrompu

Si `loadManifest()` throw, le TUI ne se lance pas. L'erreur est propagée à `cli.mjs` qui affiche un message d'erreur classique.

### Aucun résultat de recherche

Afficher un message centré dans le viewport :

```
│                                                                      │
│                   No agents match "xyzzy"                            │
│                   Try a different search term                        │
│                                                                      │
```

### NO_COLOR

`ansi.mjs` respecte `NO_COLOR` : toutes les fonctions de couleur retournent le texte brut. Le box drawing et les caractères Unicode restent fonctionnels (ce ne sont pas des "couleurs"). Le TUI reste utilisable en monochrome — la ligne sélectionnée est marquée par `▸` et la sélection par `✓`.

### process.stdout.columns === undefined

En théorie impossible en mode TTY, mais par sécurité :

```javascript
export function getSize() {
  return {
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}
```

### Emojis mal rendus (terminal sans support Unicode)

Les icônes de catégorie utilisent des emojis. Sur un terminal sans support (rare en 2025+), les fallback sont gérés par le terminal lui-même (affichage d'un `?` ou carré). L'alignement peut être perturbé mais le TUI reste fonctionnel grâce à `visibleLength()` qui calcule les largeurs correctement.

### Race condition entre input et install

Pendant le mode `installing`, le parseur d'input retourne `null` pour toutes les touches sauf Ctrl+C. Cela empêche les transitions d'état parasites pendant une opération asynchrone.

---

## Annexe A : Récapitulatif des fichiers à modifier

| Fichier                   | Action    | Détail                                          |
|---------------------------|-----------|--------------------------------------------------|
| `src/tui/index.mjs`      | Créer     | Orchestrateur TUI                                |
| `src/tui/state.mjs`      | Créer     | State machine + reducers                         |
| `src/tui/renderer.mjs`   | Créer     | Frame buffer rendering                           |
| `src/tui/input.mjs`      | Créer     | Keystroke parsing                                |
| `src/tui/screen.mjs`     | Créer     | Terminal I/O                                     |
| `src/tui/ansi.mjs`       | Créer     | ANSI primitives                                  |
| `bin/cli.mjs`            | Modifier  | Ajouter commande `browse` + default TUI en TTY   |
| `package.json`           | —         | Aucune modification (zero deps)                  |
| `tests/tui.test.mjs`     | Créer     | Tests unitaires pour state.mjs et input.mjs      |

## Annexe B : Ordre d'implémentation recommandé

```
Phase 1 — Fondations (testable sans TUI visuel)
├── 1. ansi.mjs          — Primitives, fonctions pures → tests unitaires
├── 2. input.mjs         — Parseur de touches → tests unitaires
└── 3. state.mjs         — State machine + reducers → tests unitaires

Phase 2 — Rendu
├── 4. screen.mjs        — Terminal control layer
├── 5. renderer.mjs      — Frame buffer construction → tests snapshot
└── 6. index.mjs         — Wiring + lifecycle

Phase 3 — Intégration
├── 7. cli.mjs (mod)     — Ajout route TUI
├── 8. Test e2e           — Test manuel interactif
└── 9. Polish             — Animations spinner, edge cases resize
```

## Annexe C : Testabilité

### Tests unitaires (automatisés)

| Module         | Testable ? | Stratégie                                           |
|----------------|-----------|------------------------------------------------------|
| `ansi.mjs`     | ✅         | Tests purs : `stripAnsi()`, `visibleLength()`, etc. |
| `input.mjs`    | ✅         | Feed bytes → assert actions                          |
| `state.mjs`    | ✅         | Create state → apply action → assert new state       |
| `renderer.mjs` | ✅         | Snapshot tests : render(state) → compare strings     |
| `screen.mjs`   | ⚠️ Mock    | Mock `process.stdout.write()`, test flush()          |
| `index.mjs`    | ⚠️ E2E    | Test manuel ou avec spawn + pseudo-TTY               |

### Exemple de test pour `state.mjs`

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, update } from '../src/tui/state.mjs';

describe('TUI State', () => {
  const manifest = { /* mini manifest for testing */ };
  const terminal = { cols: 80, rows: 24 };

  it('should move cursor down', () => {
    const state = createInitialState(manifest, terminal);
    const next = update(state, { action: 'DOWN' });
    assert.equal(next.list.cursor, 1);
  });

  it('should not move cursor below list length', () => {
    const state = createInitialState(manifest, terminal);
    const end = update(state, { action: 'END' });
    const beyond = update(end, { action: 'DOWN' });
    assert.equal(beyond.list.cursor, end.list.cursor);
  });

  it('should enter search mode on /', () => {
    const state = createInitialState(manifest, terminal);
    const next = update(state, { action: 'SEARCH' });
    assert.equal(next.mode, 'search');
    assert.equal(next.search.active, true);
  });

  it('should filter agents during search', () => {
    const state = createInitialState(manifest, terminal);
    let s = update(state, { action: 'SEARCH' });
    s = update(s, { action: 'CHAR', char: 'p' });
    s = update(s, { action: 'CHAR', char: 'o' });
    s = update(s, { action: 'CHAR', char: 's' });
    s = update(s, { action: 'CHAR', char: 't' });
    assert.ok(s.list.items.some(a => a.name === 'postgres-pro'));
    assert.ok(s.list.items.length < state.list.items.length);
  });

  it('should toggle selection with SPACE', () => {
    const state = createInitialState(manifest, terminal);
    const next = update(state, { action: 'SELECT' });
    assert.equal(next.selection.size, 1);
    assert.ok(next.selection.has(state.list.items[0].name));
  });

  it('should switch tabs with TAB', () => {
    const state = createInitialState(manifest, terminal);
    const next = update(state, { action: 'TAB' });
    assert.equal(next.tabs.activeIndex, 1);
  });

  it('should wrap tabs circularly', () => {
    let state = createInitialState(manifest, terminal);
    // Go backwards from first tab
    state = update(state, { action: 'SHIFT_TAB' });
    assert.equal(state.tabs.activeIndex, state.tabs.ids.length - 1);
  });
});
```

### Exemple de test pour `input.mjs`

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseKey, Action } from '../src/tui/input.mjs';

describe('TUI Input Parser', () => {
  it('should parse arrow up', () => {
    assert.deepEqual(parseKey('\x1b[A', 'browse'), { action: Action.UP });
  });

  it('should parse Ctrl+C as QUIT', () => {
    assert.deepEqual(parseKey('\x03', 'browse'), { action: Action.QUIT });
  });

  it('should parse / as SEARCH in browse', () => {
    assert.deepEqual(parseKey('/', 'browse'), { action: Action.SEARCH });
  });

  it('should parse / as CHAR in search mode', () => {
    assert.deepEqual(parseKey('/', 'search'), { action: Action.CHAR, char: '/' });
  });

  it('should parse Space as SELECT in browse', () => {
    assert.deepEqual(parseKey(' ', 'browse'), { action: Action.SELECT });
  });

  it('should parse q as QUIT in browse', () => {
    assert.deepEqual(parseKey('q', 'browse'), { action: Action.QUIT });
  });

  it('should parse q as CHAR in search mode', () => {
    assert.deepEqual(parseKey('q', 'search'), { action: Action.CHAR, char: 'q' });
  });

  it('should parse Shift+Tab', () => {
    assert.deepEqual(parseKey('\x1b[Z', 'browse'), { action: Action.SHIFT_TAB });
  });

  it('should return null for unknown sequences', () => {
    assert.equal(parseKey('\x1b[99~', 'browse'), null);
  });
});
```
