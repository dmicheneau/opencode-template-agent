// ─── ANSI Color Helpers (imported from shared module) ───────────────────────────

import { padEnd as ansiPadEnd, bold, dim, red, green, yellow, cyan } from './tui/ansi.mjs';

// Re-export for consumers (e.g. bin/cli.mjs)
export { bold, dim, red, green, yellow, cyan };

// Combined helper
export const boldCyan = (/** @type {string} */ t) => bold(cyan(t));

/** ANSI escape overhead for a single color wrap (e.g. cyan). Resolves to 0 when NO_COLOR is set. */
const ANSI_PAD_OVERHEAD = cyan('').length;

// ─── Status Icons ───────────────────────────────────────────────────────────────

const CHECK = green('✓');
const CROSS = red('✗');
const WARN  = yellow('⚠');
const INFO  = cyan('ℹ');
const ARROW = dim('→');

// ─── Category Icons ─────────────────────────────────────────────────────────────

/** @type {Record<string, string>} */
const CATEGORY_ICONS = {
  languages: '💻',
  ai:        '🤖',
  web:       '🌐',
  'data-api':'🗄️',
  devops:    '⚙️',
  devtools:  '🛠️',
  security:  '🔒',
  mcp:       '🔌',
  business:  '📊',
  docs:      '📝',
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
      const name = ansiPadEnd(cyan(agent.name), maxNameLen + ANSI_PAD_OVERHEAD);
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
    const name = ansiPadEnd(cyan(agent.name), maxNameLen + ANSI_PAD_OVERHEAD);
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
