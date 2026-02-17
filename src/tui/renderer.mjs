// ─── renderer.mjs ── Pure frame-buffer builder ──────────────────────────────
// state → string. Zero side effects. Commander / hacker-news terminal style.
// Zero npm deps, Node 20+ ESM.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CLEAR_LINE, BOX, bold, inverse, cyan, green, yellow, red, white,
  boldCyan, brightCyan, brightGreen, brightWhite,
  visibleLength, padEnd, padEndAscii, truncate,
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

/** Wrap content inside │ ... │ padded to full width, prefixed with CLEAR_LINE. */
function bdr(content, W) {
  const iw = W - 4;
  const gap = Math.max(0, iw - visibleLength(content));
  return `${CLEAR_LINE}${cyan(BOX.vertical)} ${content}${' '.repeat(gap)} ${cyan(BOX.vertical)}`;
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

function buildTabs(state, iw) {
  const { tabs } = state;
  const parts = tabs.labels.map((l, i) => {
    if (i === tabs.activeIndex) return bold(inverse(`[${l}]`));
    // Colorize parenthesized count in inactive tabs
    const colored = l.replace(/\((\d+)\)/, (_, n) => brightCyan(`(${n})`));
    return white(colored);
  });
  const full = ' ' + parts.join(' ');
  if (visibleLength(full) <= iw) return [full];

  // Wrap to 2 rows
  const r1 = [], r2 = [];
  let w = 1, split = false;
  for (const p of parts) {
    const pw = visibleLength(p);
    if (!split && w + pw + 1 <= iw) { r1.push(p); w += pw + 1; }
    else { split = true; r2.push(p); }
  }
  const lines = [' ' + r1.join(' ')];
  if (r2.length) lines.push(' ' + r2.join(' '));
  return lines;
}

// ─── Agent List ─────────────────────────────────────────────────────────────

function renderAgentList(state, out, W) {
  const iw = W - 4;
  if (state.tabs.ids[state.tabs.activeIndex] === 'packs') { renderPacks(state, out, W); return; }

  // Headers + separator
  out.push(bdr('  ' + bold(brightCyan(padEnd('CATEGORY', COL_CAT + COL_ICON)))
    + bold(brightCyan(padEnd('NAME', COL_NAME))) + bold(brightCyan('DESCRIPTION')), W));
  out.push(bdr('  ' + cyan(padEnd('─'.repeat(COL_CAT), COL_CAT + COL_ICON)
    + padEnd('─'.repeat(COL_NAME - 2), COL_NAME)
    + '─'.repeat(Math.min(20, Math.max(5, iw - COL_CAT - COL_ICON - COL_NAME - 4)))), W));

  const vh = getViewportHeight(state);
  const { items, cursor, scrollOffset } = state.list;
  const dw = Math.max(10, iw - COL_ICON - COL_CAT - COL_NAME - 6);

  if (items.length === 0) {
    renderEmpty(state, out, W, vh);
  } else {
    for (let i = 0; i < vh; i++) {
      const idx = scrollOffset + i;
      if (idx >= items.length) { out.push(bdr('', W)); continue; }
      const a = items[idx], cur = idx === cursor, sel = state.selection.has(a.name);
      const mk = cur ? bold(brightCyan('▸')) : sel ? bold(brightGreen('✓')) : ' ';
      const nameCol = sel ? green(padEndAscii(a.name, COL_NAME)) : brightWhite(padEndAscii(a.name, COL_NAME));
      let row = ` ${mk} ${icon(state, a.category)} ${yellow(padEndAscii(a.category, COL_CAT))}${nameCol}${cyan(truncate(a.description, dw))}`;
      if (cur) row = inverse(padEnd(row, iw));
      out.push(bdr(row, W));
    }
  }

  renderInfo(state, out, W, items.length, vh, scrollOffset);
  renderStatus(state, out, W);
}

// ─── Packs List ─────────────────────────────────────────────────────────────

function renderPacks(state, out, W) {
  const iw = W - 4, cP = 20, cA = 8;
  out.push(bdr('  ' + bold(brightCyan(padEnd('PACK', cP))) + bold(brightCyan(padEnd('AGENTS', cA))) + bold(brightCyan('DESCRIPTION')), W));
  out.push(bdr('  ' + cyan(padEnd('─'.repeat(cP - 2), cP) + padEnd('─'.repeat(cA - 2), cA)
    + '─'.repeat(Math.min(15, iw - cP - cA - 4))), W));

  const vh = getViewportHeight(state), pk = state.packs?.items || [];
  const { cursor, scrollOffset } = state.list;
  const dw = Math.max(10, iw - cP - cA - 6);

  for (let i = 0; i < vh; i++) {
    const idx = scrollOffset + i;
    if (idx >= pk.length) { out.push(bdr('', W)); continue; }
    const p = pk[idx], cur = idx === cursor;
    const ptr = cur ? bold(brightCyan('▸')) : ' ';
    let row = ` ${ptr} ${brightWhite(padEnd(p.label || p.id, cP - 2))}${brightCyan(padEnd(String(p.agents?.length || 0), cA))}${cyan(truncate(p.description || '', dw))}`;
    if (cur) row = inverse(padEnd(row, iw));
    out.push(bdr(row, W));
  }

  renderInfo(state, out, W, pk.length, vh, scrollOffset);
  renderStatus(state, out, W);
}

// ─── Pack Detail ────────────────────────────────────────────────────────────

function renderPackDetail(state, out, W) {
  const iw = W - 4, pd = state.packDetail;
  if (!pd) return;

  out.push(bdr(`  ${white('◀ Back to Packs')}  ${cyan(BOX.vertical)}  Pack: ${bold(brightCyan(pd.packLabel))} (${pd.agents.length} agents)`, W));
  out.push(bdr('', W));
  out.push(bdr('  ' + bold(brightCyan(padEnd('NAME', COL_NAME))) + bold(brightCyan('DESCRIPTION')), W));
  out.push(bdr('  ' + cyan(padEnd('─'.repeat(COL_NAME - 2), COL_NAME)
    + '─'.repeat(Math.min(20, Math.max(5, iw - COL_NAME - 6)))), W));

  const vh = Math.max(1, getViewportHeight(state) - 2);
  const { agents, cursor, scrollOffset } = pd;
  const dw = Math.max(10, iw - COL_NAME - 6);

  for (let i = 0; i < vh; i++) {
    const idx = scrollOffset + i;
    if (idx >= agents.length) { out.push(bdr('', W)); continue; }
    const a = agents[idx], cur = idx === cursor, sel = state.selection.has(a.name);
    const mk = sel && cur ? bold(brightGreen('✓')) + bold(brightCyan('▸'))
      : cur ? ' ' + bold(brightCyan('▸')) : sel ? bold(brightGreen('✓')) + ' ' : '  ';
    let row = ` ${mk} ${sel ? green(padEnd(a.name, COL_NAME)) : brightWhite(padEnd(a.name, COL_NAME))}${cyan(truncate(a.description, dw))}`;
    if (cur) row = inverse(padEnd(row, iw));
    out.push(bdr(row, W));
  }

  out.push(bdr('', W));
  out.push(bdr(white(`  ${cyan('[Space]')} Select  ${cyan('[a]')} Select all  ${cyan('[Enter]')} Install selected  ${cyan('[Esc]')} Back`), W));
}

// ─── Info Line ──────────────────────────────────────────────────────────────

function renderInfo(state, out, W, total, vh, off) {
  if (state.search?.active) {
    out.push(bdr(`  ${bold(brightCyan('Search:'))} ${white(state.search.query)}${cyan('█')}`, W));
  } else if (total > vh) {
    out.push(bdr(cyan(`  ↑↓ ${off + 1}-${Math.min(off + vh, total)} of ${total}`), W));
  } else {
    out.push(bdr('', W));
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
  const iw = W - 4, agents = state.install?.agents || [];
  const dw = Math.min(50, iw - 10), pad = ' '.repeat(Math.max(0, Math.floor((iw - dw) / 2)));
  const di = dw - 4;
  const dl = (c) => {
    const g = Math.max(0, di - visibleLength(c));
    return `${pad}${cyan(BOX.vertical)} ${c}${' '.repeat(g)} ${cyan(BOX.vertical)}`;
  };
  const dTop = `${pad}${cyan(BOX.topLeft + BOX.horizontal)} ${boldCyan('Install')} ${cyan(BOX.horizontal.repeat(Math.max(0, dw - 12)) + BOX.topRight)}`;
  const dBot = `${pad}${cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, dw - 2)) + BOX.bottomRight)}`;

  out.push(bdr('', W));
  out.push(bdr(dTop, W));
  out.push(bdr(dl(''), W));
  out.push(bdr(dl(bold(`Install ${agents.length} agent(s)?`)), W));
  // Clamp maxShow based on viewport height (leave room for dialog chrome)
  const maxShow = Math.max(1, getViewportHeight(state) - 6);
  const show = agents.slice(0, maxShow);
  for (const a of show) out.push(bdr(dl(`  - ${white(a.name)}`), W));
  if (agents.length > maxShow) out.push(bdr(dl(white(`  ... and ${agents.length - maxShow} more`)), W));
  out.push(bdr(dl(''), W));
  out.push(bdr(dl(`  ${green('[y]')} Yes  ${red('[n]')} No`), W));
  out.push(bdr(dBot, W));
  out.push(bdr('', W));
}

// ─── Install Progress ───────────────────────────────────────────────────────

function renderProgress(state, out, W) {
  const inst = state.install;
  if (!inst) return;
  const { agents, current, results } = inst, total = agents.length, iw = W - 4;

  out.push(bdr('', W));
  out.push(bdr(`  ${bold(brightCyan(`Installing ${total} agent(s)...`))}`, W));
  out.push(bdr('', W));

  for (let i = 0; i < agents.length; i++) {
    const a = agents[i], r = results[i];
    if (r) {
      const st = r.status === 'installed' ? bold(brightGreen('✓')) : r.status === 'skipped' ? yellow('⚠') : red('✗');
      const dt = r.status === 'installed' ? cyan(` → .opencode/agents/${a.category}/${a.name}.md`)
        : r.status === 'skipped' ? yellow(' (skipped)') : red(' (failed)');
      out.push(bdr(`  ${st} ${white(a.name)}${truncate(dt, Math.max(10, iw - visibleLength(a.name) - 6))}`, W));
    } else if (i === current) {
      const fr = SPINNER[Math.floor(Date.now() / 80) % SPINNER.length];
      out.push(bdr(`  ${cyan(fr)} ${brightWhite(a.name)} ${yellow('(installing...)')}`, W));
    } else {
      out.push(bdr(`  ${white('·')} ${white(a.name)} ${white('(pending)')}`, W));
    }
  }

  out.push(bdr('', W));
  const done = results.length, bw = Math.min(30, iw - 20);
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
  const q = state.search?.query || '', mid = Math.floor(vh / 2), iw = W - 4;
  const center = (txt) => ' '.repeat(Math.max(0, Math.floor((iw - visibleLength(txt)) / 2))) + yellow(txt);
  for (let i = 0; i < vh; i++) {
    if (i === mid - 1) out.push(bdr(center(q ? `No agents match "${q}"` : 'No agents to display'), W));
    else if (i === mid && q) out.push(bdr(center('Try a different search term'), W));
    else out.push(bdr('', W));
  }
}

// ─── Too Small ──────────────────────────────────────────────────────────────

function renderTooSmall(cols, rows) {
  const w = Math.max(cols, 24), lines = [];
  const msg = ['', '  Terminal too small.', `  Min: ${MIN_COLS}x${MIN_ROWS}`,
    `  Current: ${cols}x${rows}`, '', '  Resize to continue.', ''];
  lines.push(cyan(BOX.topLeft + BOX.horizontal.repeat(Math.max(0, w - 2)) + BOX.topRight));
  for (const m of msg) {
    const g = Math.max(0, w - visibleLength(m) - 4);
    lines.push(`${cyan(BOX.vertical)} ${m}${' '.repeat(g)} ${cyan(BOX.vertical)}`);
  }
  lines.push(cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, w - 2)) + BOX.bottomRight));
  while (lines.length < rows) lines.push(CLEAR_LINE);
  return lines.map(l => CLEAR_LINE + l).join('\n');
}

// ─── Main Render ────────────────────────────────────────────────────────────

/**
 * Render the complete frame from state.
 * Pure function: no side effects, returns a string ready for flush().
 * @param {object} state - TuiState
 * @returns {string}
 */
export function render(state) {
  const { cols, rows } = state.terminal;
  if (cols < MIN_COLS || rows < MIN_ROWS) return renderTooSmall(cols, rows);

  const iw = cols - 4, out = [];

  // Top border
  out.push(topBorder(cols, state));

  // Blank
  out.push(bdr('', cols));

  // Tab bar (1 or 2 rows)
  const tabs = buildTabs(state, iw);
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
