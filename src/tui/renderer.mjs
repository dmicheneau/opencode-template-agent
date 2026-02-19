// ─── renderer.mjs ── Pure frame-buffer builder ──────────────────────────────
// state → string. Zero side effects except Date.now() for spinner animation.
// Commander / hacker-news terminal style. Zero npm deps, Node 20+ ESM.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CLEAR_LINE, BOX, bold, inverse, cyan, green, yellow, red, white,
  boldCyan, brightCyan, brightGreen, brightWhite, dim,
  bgRow, catColor, tabColor,
  visibleLength, padEnd, padEndAscii, truncate,
  SPINNER_INTERVAL_MS,
} from './ansi.mjs';
import { getViewportHeight } from './state.mjs';

// ─── Layout Constants ───────────────────────────────────────────────────────

const MIN_COLS = 60;
const MIN_ROWS = 15;
const COL_ICON = 4;
const COL_CAT  = 10;
const COL_NAME = 30;
const SPINNER  = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const icon = (s, id) => s.manifest?.categories?.[id]?.icon || '📦';

/** Style agent/pack name based on cursor and selection state. */
const nameStyle = (text, cur, sel) =>
  sel ? green(text) : cur ? bold(brightWhite(text)) : brightWhite(text);

/** Wrap content inside │ ... │ padded to full width, prefixed with CLEAR_LINE. */
function bdr(content, W, bg) {
  const innerWidth = W - 4;
  const gap = Math.max(0, innerWidth - visibleLength(content));
  const padded = `${content}${' '.repeat(gap)}`;
  const inner = bg ? bg(` ${padded} `) : ` ${padded} `;
  return `${CLEAR_LINE}${cyan(BOX.vertical)}${inner}${cyan(BOX.vertical)}`;
}

function topBorder(W, state) {
  const title = ' OPENCODE AGENTS ';
  const sel = state.selection.size;
  const selTxt = sel > 0 ? `─ ${sel} selected ` : '';
  const prefix = cyan(BOX.topLeft + BOX.horizontal) + bold(brightCyan(title)) + cyan(BOX.horizontal);
  const suffix = selTxt ? bold(brightGreen(selTxt)) : '';
  const fill = cyan(BOX.horizontal.repeat(Math.max(0, W - visibleLength(prefix) - visibleLength(suffix) - 1)));
  return CLEAR_LINE + prefix + fill + suffix + cyan(BOX.topRight);
}

function botBorder(W) {
  return CLEAR_LINE + cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, W - 2)) + BOX.bottomRight);
}

// ─── Tab Bar ────────────────────────────────────────────────────────────────

function buildTabs(state, innerWidth) {
  const { tabs } = state;
  const parts = tabs.labels.map((l, i) => {
    const id = tabs.ids[i];
    const color = tabColor(id);
    if (i === tabs.activeIndex) return bold(inverse(`[${l}]`));
    // Colorize count in inactive tabs + distinct category color
    const colored = l.replace(/\((\d+)\)/, (_, n) => dim(`(${n})`));
    return color(colored);
  });
  const full = ' ' + parts.join(' ');
  if (visibleLength(full) <= innerWidth) return [full];

  // Wrap to 2 rows
  const r1 = [], r2 = [];
  let w = 1, split = false;
  for (const p of parts) {
    const pw = visibleLength(p);
    if (!split && w + pw + 1 <= innerWidth) { r1.push(p); w += pw + 1; }
    else { split = true; r2.push(p); }
  }
  const lines = [' ' + r1.join(' ')];
  if (r2.length) lines.push(' ' + r2.join(' '));
  return lines;
}

// ─── Agent List ─────────────────────────────────────────────────────────────

function renderAgentList(state, out, W) {
  const innerWidth = W - 4;
  if (state.tabs.ids[state.tabs.activeIndex] === 'packs') { renderPacks(state, out, W); return; }

  // Headers + separator
  out.push(bdr('  ' + bold(brightCyan(padEnd('CATEGORY', COL_CAT + COL_ICON)))
    + bold(brightCyan(padEnd('NAME', COL_NAME))) + bold(brightCyan('DESCRIPTION')), W));
  out.push(bdr('  ' + cyan(padEnd('─'.repeat(COL_CAT), COL_CAT + COL_ICON)
    + padEnd('─'.repeat(COL_NAME - 2), COL_NAME)
    + '─'.repeat(Math.min(20, Math.max(5, innerWidth - COL_CAT - COL_ICON - COL_NAME - 4)))), W));

  const vh = getViewportHeight(state);
  const { items, cursor, scrollOffset } = state.list;
  const descWidth = Math.max(10, innerWidth - COL_ICON - COL_CAT - COL_NAME - 6);

  if (items.length === 0) {
    renderEmpty(state, out, W, vh);
  } else {
    for (let i = 0; i < vh; i++) {
      const idx = scrollOffset + i;
      if (idx >= items.length) { out.push(bdr('', W)); continue; }
      const a = items[idx], cur = idx === cursor, sel = state.selection.has(a.name);
      const inst = state.installed?.has(a.name);
      const mk = cur ? bold(brightCyan('▸')) : sel ? bold(brightGreen('✓')) : inst ? brightGreen('✔') : ' ';
      const cc = catColor(a.category);
      // INVARIANT: agent names and category ids are ASCII-only (enforced by manifest schema)
      const nameCol = nameStyle(padEndAscii(a.name, COL_NAME), cur, sel);
      const desc = cur ? dim(white(truncate(a.description, descWidth))) : dim(truncate(a.description, descWidth));
      const row = ` ${mk} ${icon(state, a.category)} ${cc(padEndAscii(a.category, COL_CAT))}${nameCol}${desc}`;
      out.push(bdr(row, W, cur ? bgRow : undefined));
    }
  }

  renderInfo(state, out, W, items.length, vh, scrollOffset);
  renderStatus(state, out, W);
}

// ─── Packs List ─────────────────────────────────────────────────────────────

function renderPacks(state, out, W) {
  const innerWidth = W - 4, colPack = 20, colAgents = 8;
  out.push(bdr('  ' + bold(brightCyan(padEnd('PACK', colPack))) + bold(brightCyan(padEnd('AGENTS', colAgents))) + bold(brightCyan('DESCRIPTION')), W));
  out.push(bdr('  ' + cyan(padEnd('─'.repeat(colPack - 2), colPack) + padEnd('─'.repeat(colAgents - 2), colAgents)
    + '─'.repeat(Math.min(15, innerWidth - colPack - colAgents - 4))), W));

  const vh = getViewportHeight(state), pk = state.packs?.items || [];
  const { cursor, scrollOffset } = state.list;
  const descWidth = Math.max(10, innerWidth - colPack - colAgents - 6);

  for (let i = 0; i < vh; i++) {
    const idx = scrollOffset + i;
    if (idx >= pk.length) { out.push(bdr('', W)); continue; }
    const p = pk[idx], cur = idx === cursor;
    const ptr = cur ? bold(brightCyan('▸')) : ' ';
    const row = ` ${ptr} ${nameStyle(padEnd(p.label || p.id, colPack - 2), cur, false)}${brightCyan(padEnd(String(p.agents?.length || 0), colAgents))}${cur ? dim(white(truncate(p.description || '', descWidth))) : dim(truncate(p.description || '', descWidth))}`;
    out.push(bdr(row, W, cur ? bgRow : undefined));
  }

  renderInfo(state, out, W, pk.length, vh, scrollOffset);
  renderStatus(state, out, W);
}

// ─── Pack Detail ────────────────────────────────────────────────────────────

function renderPackDetail(state, out, W) {
  const innerWidth = W - 4, pd = state.packDetail;
  if (!pd) return;

  out.push(bdr(`  ${white('◀ Back to Packs')}  ${cyan(BOX.vertical)}  Pack: ${bold(brightCyan(pd.packLabel))} (${pd.agents.length} agents)`, W));
  out.push(bdr('', W));
  out.push(bdr('  ' + bold(brightCyan(padEnd('NAME', COL_NAME))) + bold(brightCyan('DESCRIPTION')), W));
  out.push(bdr('  ' + cyan(padEnd('─'.repeat(COL_NAME - 2), COL_NAME)
    + '─'.repeat(Math.min(20, Math.max(5, innerWidth - COL_NAME - 6)))), W));

  const vh = Math.max(1, getViewportHeight(state) - 2);
  const { agents, cursor, scrollOffset } = pd;
  const descWidth = Math.max(10, innerWidth - COL_NAME - 6);

  for (let i = 0; i < vh; i++) {
    const idx = scrollOffset + i;
    if (idx >= agents.length) { out.push(bdr('', W)); continue; }
    const a = agents[idx], cur = idx === cursor, sel = state.selection.has(a.name);
    const inst = state.installed?.has(a.name);
    const mk = sel && cur ? bold(brightGreen('✓')) + bold(brightCyan('▸'))
      : cur ? ' ' + bold(brightCyan('▸')) : sel ? bold(brightGreen('✓')) + ' ' : inst ? dim(green('✔')) + ' ' : '  ';
    const nameCol = nameStyle(padEnd(a.name, COL_NAME), cur, sel);
    const desc = cur ? dim(white(truncate(a.description, descWidth))) : dim(truncate(a.description, descWidth));
    const row = ` ${mk} ${nameCol}${desc}`;
    out.push(bdr(row, W, cur ? bgRow : undefined));
  }

  out.push(bdr('', W));
  out.push(bdr(white(`  ${cyan('[Space]')} Select  ${cyan('[a]')} Select all  ${cyan('[Enter]')} Install selected  ${cyan('[Esc]')} Back`), W));
}

// ─── Info Line ──────────────────────────────────────────────────────────────

const LEGEND = `  ${brightGreen('✔')} ${dim('installed')}  ${brightGreen('✓')} ${dim('selected')}  ${brightCyan('▸')} ${dim('cursor')}`;

function renderInfo(state, out, W, total, vh, off) {
  if (state.search?.active) {
    out.push(bdr(`  ${bold(brightCyan('Search:'))} ${white(state.search.query)}${cyan('█')}`, W));
  } else if (state.flash) {
    out.push(bdr(`  ${yellow('⚠')} ${yellow(state.flash.message)}`, W));
  } else if (total > vh) {
    out.push(bdr(cyan(`  ↑↓ ${off + 1}-${Math.min(off + vh, total)} of ${total}`) + LEGEND, W));
  } else {
    out.push(bdr(LEGEND, W));
  }
}

// ─── Status Bar ─────────────────────────────────────────────────────────────

function renderStatus(state, out, W) {
  const bar = state.search?.active
    ? `  ${cyan('[Enter]')} ${white('Apply')}  ${cyan('[Esc]')} ${white('Cancel')}`
    : state.search?.query
      ? `  ${white('Filter:')} ${cyan('"' + state.search.query + '"')}  ${cyan('[/]')} ${white('Search')}  ${cyan('[Space]')} ${white('Select')}  ${cyan('[Enter]')} ${white('Install')}  ${cyan('[Tab]')} ${white('Next')}  ${cyan('[q]')} ${white('Quit')}`
      : `  ${cyan('[/]')} ${white('Search')}  ${cyan('[Space]')} ${white('Select')}  ${cyan('[Enter]')} ${white('Install')}  ${cyan('[Tab]')} ${white('Next tab')}  ${cyan('[q]')} ${white('Quit')}`;
  out.push(bdr(bar, W));
}

// ─── Confirm Dialog ─────────────────────────────────────────────────────────

function renderConfirm(state, out, W) {
  const innerWidth = W - 4, agents = state.install?.agents || [];
  const dialogWidth = Math.min(50, innerWidth - 10), pad = ' '.repeat(Math.max(0, Math.floor((innerWidth - dialogWidth) / 2)));
  const dialogInner = dialogWidth - 4;
  const dialogLine = (c) => {
    const g = Math.max(0, dialogInner - visibleLength(c));
    return `${pad}${cyan(BOX.vertical)} ${c}${' '.repeat(g)} ${cyan(BOX.vertical)}`;
  };
  const dTop = `${pad}${cyan(BOX.topLeft + BOX.horizontal)} ${boldCyan('Install')} ${cyan(BOX.horizontal.repeat(Math.max(0, dialogWidth - 12)) + BOX.topRight)}`;
  const dBot = `${pad}${cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, dialogWidth - 2)) + BOX.bottomRight)}`;

  out.push(bdr('', W));
  out.push(bdr(dTop, W));
  out.push(bdr(dialogLine(''), W));
  const title = state.confirmContext?.type === 'pack'
    ? `Install pack "${state.confirmContext.label}" (${agents.length} agents)?`
    : `Install ${agents.length} agent(s)?`;
  out.push(bdr(dialogLine(bold(title)), W));
  // Clamp maxShow based on viewport height (leave room for dialog chrome)
  const maxShow = Math.max(1, getViewportHeight(state) - 6);
  const show = agents.slice(0, maxShow);
  for (const a of show) out.push(bdr(dialogLine(`  - ${white(a.name)}`), W));
  if (agents.length > maxShow) out.push(bdr(dialogLine(white(`  ... and ${agents.length - maxShow} more`)), W));
  out.push(bdr(dialogLine(''), W));
  out.push(bdr(dialogLine(`  ${green('[y]')} Yes  ${red('[n]')} No`), W));
  out.push(bdr(dBot, W));
  out.push(bdr('', W));
}

// ─── Install Progress ───────────────────────────────────────────────────────

function renderProgress(state, out, W) {
  const inst = state.install;
  if (!inst) return;
  const { agents, current, results } = inst, total = agents.length, innerWidth = W - 4;

  out.push(bdr('', W));
  out.push(bdr(`  ${bold(brightCyan(`Installing ${total} agent(s)...`))}`, W));
  out.push(bdr('', W));

  // Viewport-limited scrolling centered on current agent
  const vh = Math.max(1, getViewportHeight(state) - 6); // leave room for header, progress bar, padding
  let scrollOffset = 0;
  if (agents.length > vh) {
    // Center on current agent
    scrollOffset = Math.max(0, Math.min(current - Math.floor(vh / 2), agents.length - vh));
  }

  if (scrollOffset > 0) {
    out.push(bdr(cyan(`  ↑ ${scrollOffset} more above`), W));
  }

  const end = Math.min(agents.length, scrollOffset + vh);
  for (let i = scrollOffset; i < end; i++) {
    const a = agents[i], r = results[i];
    if (r) {
      const st = r.status === 'installed' ? bold(brightGreen('✓')) : r.status === 'skipped' ? yellow('⚠') : red('✗');
      const agentPath = a.mode === 'primary' ? `${a.name}.md` : `${a.category}/${a.name}.md`;
      const dt = r.status === 'installed' ? cyan(` → .opencode/agents/${agentPath}`)
        : r.status === 'skipped' ? yellow(' (skipped)') : red(' (failed)');
      out.push(bdr(`  ${st} ${white(a.name)}${truncate(dt, Math.max(10, innerWidth - visibleLength(a.name) - 6))}`, W));
    } else if (i === current) {
      const fr = SPINNER[Math.floor(Date.now() / SPINNER_INTERVAL_MS) % SPINNER.length];
      out.push(bdr(`  ${cyan(fr)} ${brightWhite(a.name)} ${yellow('(installing...)')}`, W));
    } else {
      out.push(bdr(`  ${white('·')} ${white(a.name)} ${white('(pending)')}`, W));
    }
  }

  const remaining = agents.length - end;
  if (remaining > 0) {
    out.push(bdr(cyan(`  ↓ ${remaining} more below`), W));
  }

  out.push(bdr('', W));
  const done = results.length, bw = Math.min(30, innerWidth - 20);
  const filled = total > 0 ? Math.round((done / total) * bw) : 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  out.push(bdr(`  [${done}/${total}] ${cyan('█'.repeat(filled))}${white('░'.repeat(bw - filled))} ${pct}%`, W));
}

// ─── Install Done ───────────────────────────────────────────────────────────

function renderDone(state, out, W) {
  const inst = state.install;
  if (!inst) return;
  const { results, doneCursor, forceSelection } = inst;
  let ok = 0, sk = 0, fl = 0;
  for (const r of results) {
    if (r.status === 'installed') ok++;
    else if (r.status === 'skipped') sk++;
    else fl++;
  }

  out.push(bdr('', W));
  out.push(bdr(`  ${bold(brightGreen('✓'))} ${bold(brightGreen('Installation complete!'))}`, W));
  out.push(bdr('', W));
  out.push(bdr(`  ${green('Installed:')} ${green(String(ok))}  ${yellow('Skipped:')} ${yellow(String(sk))}  ${red('Failed:')} ${fl > 0 ? red(String(fl)) : white(String(fl))}`, W));
  out.push(bdr('', W));

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const isCursor = i === doneCursor && sk > 0;
    const isSelected = forceSelection && forceSelection.has(r.name);
    const ptr = isCursor ? bold(brightCyan('▸')) : ' ';
    const selMark = isSelected ? bold(brightGreen(' ✓')) : '  ';

    if (r.status === 'installed') {
      out.push(bdr(`  ${ptr} ${bold(brightGreen('✓'))} ${white(r.name)}${selMark}`, W));
    } else if (r.status === 'skipped') {
      out.push(bdr(`  ${ptr} ${yellow('⚠')} ${yellow(r.name)} ${yellow('(already exists)')}${selMark}`, W));
    } else {
      out.push(bdr(`  ${ptr} ${red('✗')} ${red(r.name)} ${red('(failed)')}${selMark}`, W));
    }
  }

  out.push(bdr('', W));
  if (sk > 0) {
    out.push(bdr(`  ${cyan('[Space]')} ${white('Select')}  ${cyan('[f]')} ${white('Force reinstall')}  ${cyan('[Enter]')} ${white('Continue')}`, W));
  } else {
    out.push(bdr(brightCyan('  Press any key to continue...'), W));
  }
}

// ─── Empty State ────────────────────────────────────────────────────────────

function renderEmpty(state, out, W, vh) {
  const q = state.search?.query || '', mid = Math.floor(vh / 2), innerWidth = W - 4;
  const center = (txt) => ' '.repeat(Math.max(0, Math.floor((innerWidth - visibleLength(txt)) / 2))) + yellow(txt);
  for (let i = 0; i < vh; i++) {
    if (i === mid - 1) out.push(bdr(center(q ? `No agents match "${q}"` : 'No agents to display'), W));
    else if (i === mid && q) out.push(bdr(center('Try a different search term'), W));
    else out.push(bdr('', W));
  }
}

// ─── Too Small ──────────────────────────────────────────────────────────────

function renderTooSmall(cols, rows) {
  const w = Math.max(cols, 30), lines = [];
  const innerWidth = w - 4; // inner width between borders

  const center = (txt) => {
    const vl = visibleLength(txt);
    const left = Math.max(0, Math.floor((innerWidth - vl) / 2));
    const right = Math.max(0, innerWidth - vl - left);
    return ' '.repeat(left) + txt + ' '.repeat(right);
  };

  const msg = [
    '',
    bold(brightCyan('⚠  TERMINAL TOO SMALL')),
    '',
    `${yellow('Current:')} ${bold(red(`${cols}×${rows}`))}`,
    `${yellow('Minimum:')} ${bold(brightGreen(`${MIN_COLS}×${MIN_ROWS}`))}`,
    '',
    white('Resize your terminal to continue.'),
    '',
  ];

  lines.push(cyan(BOX.topLeft + BOX.horizontal.repeat(Math.max(0, w - 2)) + BOX.topRight));
  for (const m of msg) {
    lines.push(`${cyan(BOX.vertical)} ${center(m)} ${cyan(BOX.vertical)}`);
  }
  lines.push(cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, w - 2)) + BOX.bottomRight));
  while (lines.length < rows) lines.push('');
  return lines.map(l => CLEAR_LINE + l).join('\n');
}

// ─── Main Render ────────────────────────────────────────────────────────────

/**
 * Render the complete frame from state.
 * Deterministic except for Date.now() used by the spinner animation.
 * @param {object} state - TuiState
 * @returns {string}
 */
export function render(state) {
  const { cols, rows } = state.terminal;
  if (cols < MIN_COLS || rows < MIN_ROWS) return renderTooSmall(cols, rows);

  const innerWidth = cols - 4, out = [];

  // Top border
  out.push(topBorder(cols, state));

  // Blank
  out.push(bdr('', cols));

  // Tab bar (1 or 2 rows)
  const tabs = buildTabs(state, innerWidth);
  for (const t of tabs) out.push(bdr(t, cols));
  if (tabs.length < 2) out.push(bdr('', cols));

  // Blank
  out.push(bdr('', cols));

  // Mode-specific content
  switch (state.mode) {
    case 'browse': case 'search': renderAgentList(state, out, cols); break;
    case 'confirm':               renderConfirm(state, out, cols);   break;
    case 'installing':            renderProgress(state, out, cols);  break;
    case 'pack_detail':           renderPackDetail(state, out, cols); break;
    case 'done':                  renderDone(state, out, cols);      break;
    default: break;
  }

  // Pad remaining rows
  while (out.length < rows - 1) out.push(bdr('', cols));

  // Bottom border
  out.push(botBorder(cols));

  return out.join('\n');
}
