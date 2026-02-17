// ─── ANSI Color Helpers (zero dependencies) ────────────────────────────────────

const NO_COLOR = 'NO_COLOR' in process.env || process.env.TERM === 'dumb';

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

/** @param {string} code */
const wrap = (code) => (/** @type {string} */ text) => NO_COLOR ? String(text) : `${ESC}${code}m${text}${RESET}`;

export const bold    = wrap('1');
export const dim     = wrap('2');
const italic  = wrap('3');
export const red     = wrap('31');
export const green   = wrap('32');
export const yellow  = wrap('33');
const blue    = wrap('34');
const magenta = wrap('35');
export const cyan    = wrap('36');
const white   = wrap('37');

// Combined helpers
const boldGreen  = (/** @type {string} */ t) => bold(green(t));
export const boldCyan   = (/** @type {string} */ t) => bold(cyan(t));
const boldRed    = (/** @type {string} */ t) => bold(red(t));
const boldYellow = (/** @type {string} */ t) => bold(yellow(t));

// ─── Status Icons ───────────────────────────────────────────────────────────────

const CHECK = green('✓');
const CROSS = red('✗');
const WARN  = yellow('⚠');
const INFO  = cyan('ℹ');
const ARROW = dim('→');

// ─── Category Icons ─────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
const CATEGORY_ICONS = {
  ai:        '🤖',
  api:       '🔌',
  database:  '🗄️',
  devops:    '⚙️',
  devtools:  '🛠️',
  docs:      '📝',
  languages: '💻',
  mcp:       '🔌',
  security:  '🔒',
  web:       '🌐',
  business:  '📊',
  team:      '👥',
};

/**
 * Get the icon for a category.
 * @param {string} category
 * @returns {string}
 */
function categoryIcon(category) {
  return CATEGORY_ICONS[category] ?? '📦';
}

// ─── Formatting Utilities ───────────────────────────────────────────────────────

/**
 * Pad a string to a fixed width.
 * @param {string} str
 * @param {number} width
 * @returns {string}
 */
function padEnd(str, width) {
  // Strip ANSI codes for length calculation
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, width - stripped.length);
  return str + ' '.repeat(padding);
}

/**
 * Print a header line.
 * @param {string} text
 */
export function header(text) {
  console.log();
  console.log(bold(text));
  console.log();
}

/**
 * Print a success message for agent installation.
 * @param {string} name
 * @param {string} destPath
 */
export function installSuccess(name, destPath) {
  console.log(`  ${CHECK} ${bold(name)} ${ARROW} ${dim(destPath)}`);
}

/**
 * Print a skip message (file already exists).
 * @param {string} name
 * @param {string} destPath
 */
export function installSkipped(name, destPath) {
  console.log(`  ${WARN} ${bold(name)} ${ARROW} ${dim(destPath)} ${yellow('(already exists, use --force)')}`);
}

/**
 * Print a dry-run preview message.
 * @param {string} name
 * @param {string} destPath
 */
export function installDryRun(name, destPath) {
  console.log(`  ${INFO} ${dim('would install')} ${bold(name)} ${ARROW} ${dim(destPath)}`);
}

/**
 * Print an error message for a failed agent install.
 * @param {string} name
 * @param {string} reason
 */
export function installError(name, reason) {
  console.log(`  ${CROSS} ${bold(name)} ${ARROW} ${red(reason)}`);
}

/**
 * Print a summary of installation.
 * @param {{ installed: number, skipped: number, failed: number }} counts
 */
export function installSummary(counts) {
  const parts = [];
  if (counts.installed > 0) parts.push(green(`${counts.installed} installed`));
  if (counts.skipped > 0)   parts.push(yellow(`${counts.skipped} skipped`));
  if (counts.failed > 0)    parts.push(red(`${counts.failed} failed`));

  console.log();
  console.log(`  ${parts.join(dim(', '))}`);
}

/**
 * Print the agents list grouped by category.
 * @param {import('./registry.mjs').Manifest} manifest
 */
export function printAgentList(manifest) {
  const total = manifest.agents.length;
  console.log();
  console.log(`${bold('📦 opencode-agents')} ${dim('—')} ${boldCyan(String(total))} ${dim('agents available')}`);

  const byCategory = /** @type {Record<string, typeof manifest.agents>} */ ({});
  for (const agent of manifest.agents) {
    if (!byCategory[agent.category]) byCategory[agent.category] = [];
    byCategory[agent.category].push(agent);
  }

  // Determine max agent name length for alignment
  const maxNameLen = manifest.agents.reduce((max, a) => Math.max(max, a.name.length), 0);

  for (const [catId, catMeta] of Object.entries(manifest.categories)) {
    const agents = byCategory[catId];
    if (!agents || agents.length === 0) continue;

    console.log();
    console.log(`${catMeta.icon} ${bold(catMeta.label)} ${dim(`(${agents.length})`)}`);

    for (const agent of agents) {
      const name = padEnd(cyan(agent.name), maxNameLen + 10); // +10 for ANSI codes
      const mode = agent.mode === 'primary' ? yellow(' ★') : '';
      console.log(`  ${name} ${dim(agent.description)}${mode}`);
    }
  }

  console.log();
  console.log(dim(`  ★ = primary agent (placed at .opencode/agents/<name>.md)`));
  console.log();
}

/**
 * Print the packs list.
 * @param {import('./registry.mjs').Manifest} manifest
 */
export function printPacksList(manifest) {
  console.log();
  console.log(`${bold('📦 opencode-agents')} ${dim('— available packs')}`);
  console.log();

  for (const [packId, pack] of Object.entries(manifest.packs)) {
    console.log(`  ${boldCyan(packId)} ${dim(`(${pack.agents.length} agents)`)} — ${pack.description}`);
    for (const agentName of pack.agents) {
      console.log(`    ${dim('•')} ${agentName}`);
    }
    console.log();
  }
}

/**
 * Print search results.
 * @param {import('./registry.mjs').AgentEntry[]} results
 * @param {string} query
 */
export function printSearchResults(results, query) {
  if (results.length === 0) {
    console.log();
    console.log(`  ${WARN} No agents found matching ${bold(`"${query}"`)}`);
    console.log();
    return;
  }

  console.log();
  console.log(`  ${INFO} ${boldCyan(String(results.length))} ${dim('result(s) for')} ${bold(`"${query}"`)}`);
  console.log();

  const maxNameLen = results.reduce((max, a) => Math.max(max, a.name.length), 0);

  for (const agent of results) {
    const name = padEnd(cyan(agent.name), maxNameLen + 10);
    const cat = dim(`(${agent.category})`);
    console.log(`  ${name} ${cat}  ${dim(agent.description)}`);
  }
  console.log();
}

/**
 * Print a generic error with usage hint.
 * @param {string} message
 */
export function errorMessage(message) {
  console.error();
  console.error(`  ${CROSS} ${red(message)}`);
  console.error();
}

/**
 * Print a generic info message.
 * @param {string} message
 */
export function infoMessage(message) {
  console.log(`  ${INFO} ${message}`);
}
