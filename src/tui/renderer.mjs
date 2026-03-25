// ─── renderer.mjs ── Pure frame-buffer builder ──────────────────────────────
// state → string. Zero side effects except Date.now() for spinner animation.
// Commander / hacker-news terminal style. Zero npm deps, Node 20+ ESM.
// ─────────────────────────────────────────────────────────────────────────────

import {
  CLEAR_LINE, BOX, bold, inverse, cyan, green, yellow, red, white,
  boldCyan, brightCyan, brightGreen, brightWhite, dim,
  stateInstalled, stateOutdated, stateUnknown,
  bgRow, catColor, tabColor,
  visibleLength, padEnd, padEndAscii, truncate,
  SPINNER_INTERVAL_MS,
} from './ansi.mjs';
import { getViewportHeight, getPresetDescription } from './state.mjs';
import { PERMISSION_NAMES } from '../permissions/presets.mjs';
import { getWarningsForPreset, getWarningsForPermission } from '../permissions/warnings.mjs';

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
  const vLen = visibleLength(content);
  const fitted = vLen > innerWidth ? truncate(content, innerWidth) : content;
  const gap = Math.max(0, innerWidth - visibleLength(fitted));
  const padded = `${fitted}${' '.repeat(gap)}`;
  const inner = bg ? bg(` ${padded} `) : ` ${padded} `;
  return `${CLEAR_LINE}${cyan(BOX.vertical)}${inner}${cyan(BOX.vertical)}`;
}

function topBorder(W, state) {
  const isSuggest = state.mode === 'suggest';
  const title = isSuggest ? ' OPENCODE AGENTS — SUGGESTIONS ' : ' OPENCODE AGENTS ';
  const instCount = state.installed?.size || 0;
  const totalCount = state.allAgents?.length || 0;
  const counterTxt = `✔ ${instCount}/${totalCount} `;
  const sel = state.selection.size;
  const selTxt = sel > 0 ? `─ ${sel} selected ` : '';
  const prefix = cyan(BOX.topLeft + BOX.horizontal) + bold(brightCyan(title)) + cyan(BOX.horizontal);
  const counter = stateInstalled(counterTxt);
  const suffix = selTxt ? bold(brightGreen(selTxt)) : '';
  const fill = cyan(BOX.horizontal.repeat(Math.max(0, W - visibleLength(prefix) - visibleLength(counter) - visibleLength(suffix) - 1)));
  return CLEAR_LINE + prefix + counter + fill + suffix + cyan(BOX.topRight);
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
      const agentState = state.agentStates?.[a.name];
      // See ansi.mjs for EAW width considerations on marker characters
      const mk = cur ? bold(brightCyan('▸'))
        : sel ? bold(brightGreen('✓'))
        : agentState === 'outdated' ? stateOutdated('↻')
        : agentState === 'unknown' ? stateUnknown('?')
        : agentState === 'installed' ? stateInstalled('✔')
        // 'new' state intentionally renders as blank (no marker)
        : ' ';
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
    const agentState = state.agentStates?.[a.name];
    const mk = sel && cur ? bold(brightGreen('✓')) + bold(brightCyan('▸'))
      : cur ? ' ' + bold(brightCyan('▸'))
      : sel ? bold(brightGreen('✓')) + ' '
      : agentState === 'outdated' ? stateOutdated('↻') + ' '
      : agentState === 'unknown' ? stateUnknown('?') + ' '
      : agentState === 'installed' ? stateInstalled('✔') + ' '
      // 'new' state intentionally renders as blank (no marker)
      : '  ';
    const nameCol = nameStyle(padEndAscii(a.name, COL_NAME), cur, sel);
    const desc = cur ? dim(white(truncate(a.description, descWidth))) : dim(truncate(a.description, descWidth));
    const row = ` ${mk} ${nameCol}${desc}`;
    out.push(bdr(row, W, cur ? bgRow : undefined));
  }

  out.push(bdr('', W));
  out.push(bdr(white(`  ${cyan('[Space]')} Select  ${cyan('[a]')} Select all  ${cyan('[Enter]')} Install selected  ${cyan('[Esc]')} Back`), W));
}

// ─── Info Line ──────────────────────────────────────────────────────────────

const LEGEND_FULL = `  ${stateInstalled('✔')} ${dim('installed')}  ${stateOutdated('↻')} ${dim('outdated')}  ${stateUnknown('?')} ${dim('unknown')}  ${brightGreen('✓')} ${dim('selected')}  ${brightCyan('▸')} ${dim('cursor')}`;
const LEGEND_SHORT = `  ${stateInstalled('✔')}${dim('inst')} ${stateOutdated('↻')}${dim('outd')} ${stateUnknown('?')}${dim('unk')} ${brightGreen('✓')}${dim('sel')} ${brightCyan('▸')}${dim('cur')}`;
const LEGEND_MINI = `  ${stateInstalled('✔')} ${stateOutdated('↻')} ${stateUnknown('?')} ${brightGreen('✓')} ${brightCyan('▸')}`;

function renderInfo(state, out, W, total, vh, off) {
  const innerWidth = W - 4;
  if (state.search?.active) {
    out.push(bdr(`  ${bold(brightCyan('Search:'))} ${white(state.search.query)}${cyan('█')}`, W));
  } else if (state.flash) {
    out.push(bdr(`  ${yellow('⚠')} ${yellow(state.flash.message)}`, W));
  } else {
    const prefix = total > vh ? cyan(`  ↑↓ ${off + 1}-${Math.min(off + vh, total)} of ${total}`) : '';
    const prefixLen = visibleLength(prefix);
    // Pick legend variant that fits
    let legend = LEGEND_FULL;
    if (prefixLen + visibleLength(legend) > innerWidth) legend = LEGEND_SHORT;
    if (prefixLen + visibleLength(legend) > innerWidth) legend = LEGEND_MINI;
    if (prefixLen + visibleLength(legend) > innerWidth) legend = '';
    out.push(bdr(prefix + legend, W));
  }
}

// ─── Status Bar ─────────────────────────────────────────────────────────────

function renderStatus(state, out, W) {
  const isPacksTab = state.tabs.ids[state.tabs.activeIndex] === 'packs';
  const installAllHint = !isPacksTab ? `  ${cyan('[i]')} ${white('Install All')}` : '';
  const bar = state.search?.active
    ? `  ${cyan('[Enter]')} ${white('Apply')}  ${cyan('[Esc]')} ${white('Cancel')}`
    : state.search?.query
      ? `  ${white('Filter:')} ${cyan('"' + state.search.query + '"')}  ${cyan('[/]')} ${white('Search')}  ${cyan('[Space]')} ${white('Select')}  ${cyan('[Enter]')} ${white('Install')}${installAllHint}  ${cyan('[x]')} ${white('Uninstall')}  ${cyan('[Tab]')} ${white('Next')}  ${cyan('[q]')} ${white('Quit')}`
      : `  ${cyan('[/]')} ${white('Search')}  ${cyan('[Space]')} ${white('Select')}  ${cyan('[Enter]')} ${white('Install')}${installAllHint}  ${cyan('[x]')} ${white('Uninstall')}  ${cyan('[Tab]')} ${white('Next tab')}  ${cyan('[q]')} ${white('Quit')}`;
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
  out.push(bdr(dialogLine(`  ${green('[y/o]')} Yes  ${red('[n]')} No`), W));
  out.push(bdr(dBot, W));
  out.push(bdr('', W));
}

// ─── Install Progress ───────────────────────────────────────────────

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
  const { results, doneCursor, forceSelection, doneScrollOffset = 0 } = inst;
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

  // Permission summary (S4.31)
  if (state.perm?.selectedPreset && state.perm.selectedPreset !== 'skip') {
    out.push(bdr(dim(`  Permissions: ${state.perm.selectedPreset} preset`), W));
  }

  out.push(bdr('', W));

  // Viewport-limited scrolling for results list
  const vh = Math.max(1, getViewportHeight(state) - 7);

  if (doneScrollOffset > 0) {
    out.push(bdr(cyan(`  ↑ ${doneScrollOffset} more above`), W));
  }

  const end = Math.min(results.length, doneScrollOffset + vh);
  for (let i = doneScrollOffset; i < end; i++) {
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

  const remaining = results.length - end;
  if (remaining > 0) {
    out.push(bdr(cyan(`  ↓ ${remaining} more below`), W));
  }

  out.push(bdr('', W));
  if (sk > 0) {
    out.push(bdr(`  ${cyan('[Space]')} ${white('Select')}  ${cyan('[f]')} ${white('Force reinstall')}  ${cyan('[Enter]')} ${white('Continue')}`, W));
  } else {
    out.push(bdr(brightCyan('  Press any key to continue...'), W));
  }
}

// ─── Suggest Screen ──────────────────────────────────────────────────────────

function renderSuggest(state, out, W) {
  const suggestions = state.suggestions || [];
  const suggestCursor = state.suggestCursor || 0;
  const suggestSelected = state.suggestSelected || new Set();
  const innerWidth = W - 4;

  // Detected stack summary
  const profile = state._suggestProfile;
  const langs = profile?.languages?.join(' · ') || '';
  const tools = profile?.tools?.join(' · ') || '';
  const stackParts = [langs, tools].filter(Boolean).join(' · ');
  const stackLine = stackParts ? `  Detected stack: ${white(stackParts)}` : `  Stack detected`;

  out.push(bdr(stackLine, W));
  out.push(bdr('', W));

  if (suggestions.length === 0) {
    out.push(bdr(dim('  No suggestions for this project.'), W));
  } else {
    const descWidth = Math.max(10, innerWidth - 34);
    for (let i = 0; i < suggestions.length; i++) {
      const { agent, score, reasons } = suggestions[i];
      const cur = i === suggestCursor;
      const sel = suggestSelected.has(agent.name);
      const pct = `${Math.round(score * 100)}%`;

      const ptr = cur ? bold(brightCyan('▸')) : ' ';
      const checkmark = sel ? bold(brightGreen('✓')) : ' ';
      const nameStr = nameStyle(padEndAscii(agent.name, 24), cur, sel);
      const pctStr = cur ? bold(brightCyan(padEnd(pct, 5))) : dim(padEnd(pct, 5));
      const desc = truncate(agent.description, descWidth);
      const descStr = cur ? dim(white(desc)) : dim(desc);

      const row = ` ${ptr} ${checkmark} ${nameStr}${pctStr}`;
      out.push(bdr(row, W, cur ? bgRow : undefined));

      if (cur) {
        const reason = reasons[0] ? truncate(reasons[0], innerWidth - 6) : '';
        out.push(bdr(`      ${dim(reason)}  ${descStr}`, W));
      }
    }
  }

  out.push(bdr('', W));

  // Footer hints
  const enterLabel = suggestSelected.size > 0 ? 'Install selected' : 'Browse all agents';
  out.push(bdr(`  ${cyan('[Space]')} ${white('Toggle')}  ${cyan('[A]')} ${white('All')}  ${cyan('[Enter]')} ${white(enterLabel)}`, W));
  out.push(bdr(`  ${cyan('[B]')} ${white('Browse all agents')}  ${cyan('[Q]')} ${white('Quit')}`, W));
}

// ─── Uninstall Confirm Dialog ────────────────────────────────────────────────

function renderUninstallConfirm(state, out, W) {
  const innerWidth = W - 4;
  const target = state.uninstallTarget;
  if (!target) return;

  const dialogWidth = Math.min(50, innerWidth - 10);
  const pad = ' '.repeat(Math.max(0, Math.floor((innerWidth - dialogWidth) / 2)));
  const dialogInner = dialogWidth - 4;
  const dialogLine = (c) => {
    const g = Math.max(0, dialogInner - visibleLength(c));
    return `${pad}${cyan(BOX.vertical)} ${c}${' '.repeat(g)} ${cyan(BOX.vertical)}`;
  };
  const dTop = `${pad}${red(BOX.topLeft + BOX.horizontal)} ${bold(red('⚠ Uninstall'))} ${red(BOX.horizontal.repeat(Math.max(0, dialogWidth - 16)) + BOX.topRight)}`;
  const dBot = `${pad}${red(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, dialogWidth - 2)) + BOX.bottomRight)}`;

  out.push(bdr('', W));
  out.push(bdr(dTop, W));
  out.push(bdr(dialogLine(''), W));
  out.push(bdr(dialogLine(bold(white(`Remove agent "${target.name}"?`))), W));
  out.push(bdr(dialogLine(''), W));
  out.push(bdr(dialogLine(dim('This will delete the agent file and its lock entry.')), W));
  out.push(bdr(dialogLine(''), W));
  out.push(bdr(dialogLine(`  ${green('[y/o]')} Yes  ${red('[n]')} No`), W));
  out.push(bdr(dBot, W));
  out.push(bdr('', W));
}

// ─── Uninstalling Spinner ────────────────────────────────────────────────────

function renderUninstalling(state, out, W) {
  const fr = SPINNER[Math.floor(Date.now() / SPINNER_INTERVAL_MS) % SPINNER.length];
  const name = state.uninstallTarget?.name || 'agent';
  out.push(bdr('', W));
  out.push(bdr(`  ${cyan(fr)} ${bold(white(`Removing ${name}...`))}`, W));
  out.push(bdr('', W));
}

// ─── Empty State ────────────────────────────────────────────────────────

// ─── Preset Selector ─────────────────────────────────────────────────────

function renderPresetSelect(state, out, W) {
  const perm = state.perm;
  if (!perm) return;
  const innerWidth = W - 4;
  const dialogWidth = Math.min(50, innerWidth - 10);
  const pad = ' '.repeat(Math.max(0, Math.floor((innerWidth - dialogWidth) / 2)));
  const dialogInner = dialogWidth - 4;
  const dialogLine = (c) => {
    const g = Math.max(0, dialogInner - visibleLength(c));
    return `${pad}${cyan(BOX.vertical)} ${c}${' '.repeat(g)} ${cyan(BOX.vertical)}`;
  };
  const dTop = `${pad}${cyan(BOX.topLeft + BOX.horizontal)} ${boldCyan('Permission Preset')} ${cyan(BOX.horizontal.repeat(Math.max(0, dialogWidth - 22)) + BOX.topRight)}`;
  const dBot = `${pad}${cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, dialogWidth - 2)) + BOX.bottomRight)}`;

  out.push(bdr('', W));
  out.push(bdr(dTop, W));
  out.push(bdr(dialogLine(''), W));

  // S4.32: YOLO confirmation sub-state
  if (perm.yoloConfirm) {
    out.push(bdr(dialogLine(''), W));
    out.push(bdr(dialogLine(`  ${red('⚠')} ${bold(red('CRITICAL: Unrestricted access'))}`), W));
    out.push(bdr(dialogLine(`  ${red('All permissions set to allow.')}`), W));
    out.push(bdr(dialogLine(`  ${red('The agent will have full access.')}`), W));
    out.push(bdr(dialogLine(''), W));
    out.push(bdr(dialogLine(`  ${bold(yellow('Press y to confirm YOLO'))}`), W));
    out.push(bdr(dialogLine(`  ${dim('Any other key to cancel')}`), W));
    out.push(bdr(dBot, W));
    out.push(bdr('', W));
    return;
  }

  const opts = perm.presetOptions;
  for (let i = 0; i < opts.length; i++) {
    const name = opts[i];
    const cur = i === perm.presetCursor;
    const radio = cur ? bold(brightCyan('●')) : dim('○');
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    const suffix = name === 'yolo' ? ` ${yellow('⚠')}` : name === 'custom' ? dim('...') : '';
    const styled = cur ? bold(brightWhite(label)) : white(label);
    out.push(bdr(dialogLine(`  ${radio} ${styled}${suffix}`), W));
  }

  out.push(bdr(dialogLine(''), W));

  // Info line for currently hovered preset
  const hoveredName = opts[perm.presetCursor];
  const desc = getPresetDescription(hoveredName);
  const warnings = getWarningsForPreset(hoveredName);
  if (warnings.length > 0 && warnings[0].level === 'critical') {
    out.push(bdr(dialogLine(`  ${red('⚠')} ${red(desc)}`), W));
  } else if (warnings.length > 0 && warnings[0].level === 'high') {
    out.push(bdr(dialogLine(`  ${yellow('⚠')} ${yellow(desc)}`), W));
  } else {
    out.push(bdr(dialogLine(`  ${cyan('ℹ')} ${dim(desc)}`), W));
  }

  out.push(bdr(dBot, W));
  out.push(bdr('', W));
  out.push(bdr(`  ${cyan('[↑↓]')} ${white('Navigate')}  ${cyan('[Enter]')} ${white('Select')}  ${cyan('[Esc]')} ${white('Cancel')}`, W));
}

// ─── Per-Agent Permission Editor ─────────────────────────────────────────

function renderPermissionEdit(state, out, W) {
  const perm = state.perm;
  if (!perm) return;
  const agents = state.install?.agents || [];
  const agent = agents[perm.agentIndex];
  if (!agent) return;

  const innerWidth = W - 4;
  const agentPerms = perm.permissions[agent.name] || {};

  // Title with agent name + agent navigation
  const navHint = agents.length > 1
    ? dim(` (${perm.agentIndex + 1}/${agents.length})  Tab/Shift-Tab: switch agent`)
    : '';
  out.push(bdr(`  ${bold(brightCyan('Permissions:'))} ${bold(brightWhite(agent.name))}${navHint}`, W));
  out.push(bdr('', W));

  const colName = 16;
  let vh = Math.max(5, getViewportHeight(state) - 6);

  // Account for the extra warning line that may be displayed for the cursor row
  const cursorPermName = PERMISSION_NAMES[perm.permCursor];
  const cursorAction = (() => {
    const rawVal = agentPerms[cursorPermName] || 'ask';
    return typeof rawVal === 'string' ? rawVal : (rawVal['*'] || 'ask');
  })();
  const cursorWarnings = getWarningsForPermission(cursorPermName, cursorAction);
  if (cursorWarnings.length > 0) {
    vh = Math.max(5, vh - 1);
  }

  // Scroll if needed
  let scrollOffset = 0;
  if (PERMISSION_NAMES.length > vh) {
    scrollOffset = Math.max(0, Math.min(perm.permCursor - Math.floor(vh / 2), PERMISSION_NAMES.length - vh));
  }

  if (scrollOffset > 0) {
    out.push(bdr(cyan(`  ↑ ${scrollOffset} more above`), W));
  }

  const end = Math.min(PERMISSION_NAMES.length, scrollOffset + vh);
  for (let i = scrollOffset; i < end; i++) {
    const permName = PERMISSION_NAMES[i];
    const cur = i === perm.permCursor;
    const rawVal = agentPerms[permName] || 'ask';
    const action = typeof rawVal === 'string' ? rawVal : (rawVal['*'] || 'ask');

    // Color the action badge
    const actionStyled = action === 'allow' ? bold(green(`[${action}]`))
      : action === 'deny' ? bold(red(`[${action}]`))
      : bold(yellow(`[${action}]`));

    const ptr = cur ? bold(brightCyan('▸')) : ' ';
    const nameStyled = cur ? bold(brightWhite(padEnd(permName, colName))) : white(padEnd(permName, colName));
    const arrows = cur ? dim(' ←→') : '';
    const bashHint = permName === 'bash' && typeof rawVal === 'object' ? dim(' → (patterns...)') : '';

    const row = `  ${ptr} ${nameStyled}${actionStyled}${arrows}${bashHint}`;
    out.push(bdr(row, W, cur ? bgRow : undefined));

    // Inline warning for risky values
    if (cur) {
      const warnings = getWarningsForPermission(permName, action);
      if (warnings.length > 0) {
        const w = warnings[0];
        const warnIcon = w.level === 'critical' || w.level === 'high' ? red('⚠') : yellow('⚠');
        const warnText = w.level === 'critical' || w.level === 'high' ? red(w.message) : yellow(w.message);
        out.push(bdr(`     ${warnIcon} ${warnText}`, W));
      }
    }
  }

  const remaining = PERMISSION_NAMES.length - end;
  if (remaining > 0) {
    out.push(bdr(cyan(`  ↓ ${remaining} more below`), W));
  }

  // Flash message
  if (state.flash) {
    out.push(bdr('', W));
    out.push(bdr(`  ${green('✓')} ${green(state.flash.message)}`, W));
  }

  out.push(bdr('', W));
  out.push(bdr(`  ${cyan('[↑↓]')} ${white('Nav')}  ${cyan('[←→]')} ${white('Cycle')}  ${cyan('[Enter]')} ${white('Bash patterns')}  ${cyan('[a]')} ${white('Apply all')}  ${cyan('[Esc]')} ${white('Done')}`, W));
}

// ─── Bash Pattern Sub-Editor ─────────────────────────────────────────────

function renderBashEdit(state, out, W) {
  const perm = state.perm;
  if (!perm) return;
  const agents = state.install?.agents || [];
  const agent = agents[perm.agentIndex];
  if (!agent) return;

  const innerWidth = W - 4;
  const dialogWidth = Math.min(55, innerWidth - 6);
  const pad = ' '.repeat(Math.max(0, Math.floor((innerWidth - dialogWidth) / 2)));
  const dialogInner = dialogWidth - 4;
  const dialogLine = (c) => {
    const g = Math.max(0, dialogInner - visibleLength(c));
    return `${pad}${cyan(BOX.vertical)} ${c}${' '.repeat(g)} ${cyan(BOX.vertical)}`;
  };
  const dTop = `${pad}${cyan(BOX.topLeft + BOX.horizontal)} ${boldCyan('Bash Patterns:')} ${bold(brightWhite(agent.name))} ${cyan(BOX.horizontal.repeat(Math.max(0, dialogWidth - 20 - visibleLength(agent.name))) + BOX.topRight)}`;
  const dBot = `${pad}${cyan(BOX.bottomLeft + BOX.horizontal.repeat(Math.max(0, dialogWidth - 2)) + BOX.bottomRight)}`;

  out.push(bdr('', W));
  out.push(bdr(dTop, W));
  out.push(bdr(dialogLine(''), W));

  const patterns = perm.bashPatterns;
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    const cur = i === perm.bashCursor;
    const ptr = cur ? bold(brightCyan('▸')) : ' ';
    const actionStyled = p.action === 'allow' ? bold(green(`[${p.action}]`))
      : p.action === 'deny' ? bold(red(`[${p.action}]`))
      : bold(yellow(`[${p.action}]`));
    const patText = cur ? bold(brightWhite(`"${p.pattern}"`)) : white(`"${p.pattern}"`);
    out.push(bdr(dialogLine(`  ${ptr} ${padEnd(patText, Math.max(20, dialogInner - 16))}${actionStyled}`), W));
  }

  // "+ Add pattern" row
  const addCur = perm.bashCursor === patterns.length;
  if (state.mode === 'bash-input' && perm.bashEditingNew) {
    out.push(bdr(dialogLine(`  ${bold(brightCyan('▸'))} ${cyan('Pattern:')} ${white(perm.bashInput)}${cyan('█')}`), W));
  } else {
    const ptr = addCur ? bold(brightCyan('▸')) : ' ';
    const addText = addCur ? bold(brightCyan('+ Add pattern')) : dim('+ Add pattern');
    out.push(bdr(dialogLine(`  ${ptr} ${addText}`), W));
  }

  // Flash message
  if (state.flash) {
    out.push(bdr(dialogLine(''), W));
    out.push(bdr(dialogLine(`  ${yellow('⚠')} ${yellow(state.flash.message)}`), W));
  }

  out.push(bdr(dialogLine(''), W));
  out.push(bdr(dBot, W));
  out.push(bdr('', W));

  if (state.mode === 'bash-input') {
    out.push(bdr(`  ${cyan('[Enter]')} ${white('Confirm')}  ${cyan('[Esc]')} ${white('Cancel')}`, W));
  } else {
    out.push(bdr(`  ${cyan('[↑↓]')} ${white('Nav')}  ${cyan('[←→]')} ${white('Cycle action')}  ${cyan('[n]')} ${white('New')}  ${cyan('[d]')} ${white('Delete')}  ${cyan('[Esc]')} ${white('Back')}`, W));
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
    case 'suggest':               renderSuggest(state, out, cols);   break;
    case 'browse': case 'search': renderAgentList(state, out, cols); break;
    case 'confirm':               renderConfirm(state, out, cols);   break;
    case 'installing':            renderProgress(state, out, cols);  break;
    case 'pack_detail':           renderPackDetail(state, out, cols); break;
    case 'done':                  renderDone(state, out, cols);      break;
    case 'uninstall_confirm':     renderUninstallConfirm(state, out, cols); break;
    case 'uninstalling':          renderUninstalling(state, out, cols); break;
    case 'preset-select':         renderPresetSelect(state, out, cols); break;
    case 'permission-edit':       renderPermissionEdit(state, out, cols); break;
    case 'bash-edit':
    case 'bash-input':            renderBashEdit(state, out, cols); break;
    default: break;
  }

  // Pad remaining rows
  while (out.length < rows - 1) out.push(bdr('', cols));

  // Bottom border
  out.push(botBorder(cols));
  // Clip to terminal height — safety net against chrome miscount
  if (out.length > rows) out.length = rows;

  return out.join('\n');
}
