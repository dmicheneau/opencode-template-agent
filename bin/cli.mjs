#!/usr/bin/env node

// ─── opencode-agents CLI ────────────────────────────────────────────────────────
// Zero-dependency CLI for installing AI agent templates into OpenCode projects.
// Uses only Node.js 18+ built-in modules.
// ─────────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  getAgent,
  getCategory,
  getCategoryIds,
  getPack,
  resolvePackAgents,
  searchAgents,
  listAll,
  getManifest,
} from '../src/registry.mjs';

import { installAgents } from '../src/installer.mjs';

import {
  bold,
  dim,
  cyan,
  boldCyan,
  errorMessage,
  printAgentList,
  printPacksList,
  printSearchResults,
  header,
} from '../src/display.mjs';

// ─── Version ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const VERSION = pkg.version;

// ─── Argument Parsing ───────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   command: string;
 *   args: string[];
 *   flags: Record<string, string | string[] | boolean>;
 * }} ParsedArgs
 */

/**
 * Parse process.argv into command, positional args, and flags.
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
function parseArgs(argv) {
  const raw = argv.slice(2); // Remove node and script path
  /** @type {string[]} */
  const args = [];
  /** @type {Record<string, string | string[] | boolean>} */
  const flags = {};

  // Flags that accept multiple space- or comma-separated values
  const MULTI_VALUE_FLAGS = new Set(['pack', 'category']);

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (MULTI_VALUE_FLAGS.has(key)) {
        // Collect all following non-flag tokens as values
        const values = [];
        while (i + 1 < raw.length && !raw[i + 1].startsWith('--')) {
          values.push(raw[++i]);
        }
        // Support comma-separated: --pack backend,devops,security
        const expanded = values.flatMap((v) => v.split(',').filter(Boolean));
        // No value → treat as boolean true (will be caught as error downstream)
        flags[key] = expanded.length === 0 ? true : expanded;
      } else {
        // Check if next arg is a value (not another flag)
        const next = raw[i + 1];
        if (next && !next.startsWith('--')) {
          flags[key] = next;
          i++; // Skip the value
        } else {
          flags[key] = true;
        }
      }
    } else {
      args.push(arg);
    }
  }

  return {
    command: args[0] ?? '',
    args: args.slice(1),
    flags,
  };
}

// ─── Help Text ──────────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`
${bold('opencode-agents')} ${dim(`v${VERSION}`)} — AI agent registry for OpenCode

${bold('Usage:')}
  opencode-agents install <agent>                Install a single agent
  opencode-agents install --category <cat,...>    Install all agents in one or more categories
  opencode-agents install --pack <pack,...>       Install one or more predefined packs
  opencode-agents install --all                   Install all agents
  opencode-agents list                            List all available agents
  opencode-agents list --packs                    List available packs
  opencode-agents search <query>                  Search agents
  opencode-agents tui                             Interactive agent browser

${bold('Options:')}
  --force      Overwrite existing agent files
  --dry-run    Preview without writing files
  --help       Show this help
  --version    Show version

${bold('Examples:')}
  ${dim('$')} npx opencode-agents install postgres-pro
  ${dim('$')} npx opencode-agents install --category devops
  ${dim('$')} npx opencode-agents install --category languages,database
  ${dim('$')} npx opencode-agents install --pack backend
  ${dim('$')} npx opencode-agents install --pack backend,devops
  ${dim('$')} npx opencode-agents install --all
  ${dim('$')} npx opencode-agents search docker
  ${dim('$')} npx opencode-agents list --packs

${dim('Documentation: https://github.com/dmicheneau/opencode-template-agent')}
`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Deduplicate agents by name, preserving insertion order.
 * @param {Array<{name: string}>} agents
 * @returns {Array<{name: string}>}
 */
function deduplicateAgents(agents) {
  const seen = new Set();
  return agents.filter((a) => {
    if (seen.has(a.name)) return false;
    seen.add(a.name);
    return true;
  });
}

/**
 * Format a human-readable label: `pack "x"` or `packs "x", "y"`.
 * @param {string} singular
 * @param {string[]} names
 * @returns {string}
 */
function formatLabel(singular, names) {
  if (names.length === 1) return `${singular} "${names[0]}"`;
  const plural = singular.endsWith('y')
    ? singular.slice(0, -1) + 'ies'
    : singular + 's';
  return `${plural} "${names.join('", "')}"`;
}

// ─── Command: install ───────────────────────────────────────────────────────────

/**
 * Handle the "install" command.
 * @param {ParsedArgs} parsed
 */
async function cmdInstall(parsed) {
  const force = Boolean(parsed.flags.force);
  const dryRun = Boolean(parsed.flags['dry-run']);
  const options = { force, dryRun };

  // Guard: mutually exclusive install modes
  const modes = ['all', 'pack', 'category'].filter((f) => parsed.flags[f]);
  if (modes.length > 1) {
    errorMessage(`Cannot combine --${modes.join(' and --')}. Use one at a time.`);
    process.exit(1);
  }

  // --all: install every agent
  if (parsed.flags.all === true) {
    const agents = listAll();
    header(`Installing all ${agents.length} agents...`);
    const result = await installAgents(agents, options);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --category <name...>  (space or comma separated)
  if (parsed.flags.category) {
    if (parsed.flags.category === true) {
      errorMessage('Missing category name. Usage: opencode-agents install --category <name...>');
      process.exit(1);
    }
    const catIds = /** @type {string[]} */ (parsed.flags.category);

    const validIds = getCategoryIds();
    for (const catId of catIds) {
      if (!validIds.includes(catId)) {
        errorMessage(`Unknown category "${catId}". Valid categories: ${validIds.join(', ')}`);
        process.exit(1);
      }
    }

    const uniqueAgents = deduplicateAgents(
      catIds.flatMap((catId) => getCategory(catId))
    );

    if (uniqueAgents.length === 0) {
      errorMessage(`No agents found in ${formatLabel('category', catIds)}.`);
      process.exit(1);
    }

    header(`Installing ${uniqueAgents.length} agents from ${formatLabel('category', catIds)}...`);
    const result = await installAgents(uniqueAgents, options);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --pack <name...>  (space or comma separated)
  if (parsed.flags.pack) {
    if (parsed.flags.pack === true) {
      errorMessage('Missing pack name. Usage: opencode-agents install --pack <name...>');
      process.exit(1);
    }
    const packNames = /** @type {string[]} */ (parsed.flags.pack);

    const manifest = getManifest();
    const validPacks = Object.keys(manifest.packs);
    for (const name of packNames) {
      if (!validPacks.includes(name)) {
        errorMessage(`Unknown pack "${name}". Available packs: ${validPacks.join(', ')}`);
        process.exit(1);
      }
    }

    const uniqueAgents = deduplicateAgents(
      packNames.flatMap((name) => resolvePackAgents(name))
    );

    header(`Installing ${formatLabel('pack', packNames)} (${uniqueAgents.length} agents)...`);
    const result = await installAgents(uniqueAgents, options);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // install <agent-name>
  const agentName = parsed.args[0];
  if (!agentName) {
    errorMessage('Missing agent name. Usage: opencode-agents install <agent>');
    console.error(`  Run ${cyan('opencode-agents list')} to see available agents.`);
    console.error();
    process.exit(1);
  }

  const agent = getAgent(agentName);
  if (!agent) {
    // Try fuzzy suggestion
    const suggestions = searchAgents(agentName);
    errorMessage(`Agent "${agentName}" not found.`);
    if (suggestions.length > 0) {
      console.error(`  Did you mean: ${suggestions.slice(0, 5).map((a) => boldCyan(a.name)).join(', ')}?`);
      console.error();
    }
    process.exit(1);
  }

  const result = await installAgents([agent], options);
  process.exit(result.failed > 0 ? 1 : 0);
}

// ─── Command: list ──────────────────────────────────────────────────────────────

/**
 * Handle the "list" command.
 * @param {ParsedArgs} parsed
 */
function cmdList(parsed) {
  const manifest = getManifest();

  if (parsed.flags.packs === true) {
    printPacksList(manifest);
    return;
  }

  printAgentList(manifest);
}

// ─── Command: search ────────────────────────────────────────────────────────────

/**
 * Handle the "search" command.
 * @param {ParsedArgs} parsed
 */
function cmdSearch(parsed) {
  const query = parsed.args[0];
  if (!query) {
    errorMessage('Missing search query. Usage: opencode-agents search <query>');
    process.exit(1);
  }

  const results = searchAgents(query);
  printSearchResults(results, query);
}

// ─── Main Router ────────────────────────────────────────────────────────────────

async function main() {
  const parsed = parseArgs(process.argv);

  // Global flags
  if (parsed.flags.version === true) {
    console.log(VERSION);
    return;
  }

  if (parsed.flags.help === true || parsed.command === 'help') {
    showHelp();
    return;
  }

  // Route commands
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

    case 'tui':
      await (await import('../src/tui/index.mjs')).launchTUI({ force: Boolean(parsed.flags.force) });
      break;

    case '':
      if (process.stdin.isTTY) {
        await (await import('../src/tui/index.mjs')).launchTUI({ force: Boolean(parsed.flags.force) });
      } else {
        showHelp();
      }
      break;

    default:
      errorMessage(`Unknown command "${parsed.command}".`);
      console.error(`  Run ${cyan('opencode-agents --help')} for available commands.`);
      console.error();
      process.exit(1);
  }
}

// Run
main().catch((err) => {
  errorMessage(err.message || String(err));
  process.exit(1);
});
