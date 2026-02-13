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
 *   flags: Record<string, string | boolean>;
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
  /** @type {Record<string, string | boolean>} */
  const flags = {};

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      // Check if next arg is a value (not another flag)
      const next = raw[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++; // Skip the value
      } else {
        flags[key] = true;
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
  opencode-agents install <agent>          Install a single agent
  opencode-agents install --category <cat> Install all agents in a category
  opencode-agents install --pack <pack>    Install a predefined pack
  opencode-agents install --all            Install all agents
  opencode-agents list                     List all available agents
  opencode-agents list --packs             List available packs
  opencode-agents search <query>           Search agents

${bold('Options:')}
  --force      Overwrite existing agent files
  --dry-run    Preview without writing files
  --help       Show this help
  --version    Show version

${bold('Examples:')}
  ${dim('$')} npx opencode-agents install postgres-pro
  ${dim('$')} npx opencode-agents install --category devops
  ${dim('$')} npx opencode-agents install --pack backend
  ${dim('$')} npx opencode-agents install --all
  ${dim('$')} npx opencode-agents search docker
  ${dim('$')} npx opencode-agents list --packs

${dim('Documentation: https://github.com/dmicheneau/opencode-template-agent')}
`);
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

  // --all: install every agent
  if (parsed.flags.all === true) {
    const agents = listAll();
    header(`Installing all ${agents.length} agents...`);
    const result = await installAgents(agents, options);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --category <name>
  if (typeof parsed.flags.category === 'string') {
    const catId = parsed.flags.category;
    const validIds = getCategoryIds();

    if (!validIds.includes(catId)) {
      errorMessage(`Unknown category "${catId}". Valid categories: ${validIds.join(', ')}`);
      process.exit(1);
    }

    const agents = getCategory(catId);
    if (agents.length === 0) {
      errorMessage(`No agents found in category "${catId}".`);
      process.exit(1);
    }

    header(`Installing ${agents.length} agents from category "${catId}"...`);
    const result = await installAgents(agents, options);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --pack <name>
  if (typeof parsed.flags.pack === 'string') {
    const packName = parsed.flags.pack;
    const pack = getPack(packName);

    if (!pack) {
      const manifest = getManifest();
      const validPacks = Object.keys(manifest.packs).join(', ');
      errorMessage(`Unknown pack "${packName}". Available packs: ${validPacks}`);
      process.exit(1);
    }

    const agents = resolvePackAgents(packName);
    header(`Installing pack "${packName}" (${agents.length} agents)...`);
    const result = await installAgents(agents, options);
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

    case '':
      showHelp();
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
