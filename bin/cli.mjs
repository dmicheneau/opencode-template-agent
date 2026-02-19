#!/usr/bin/env node

// ─── opencode-agents CLI ────────────────────────────────────────────────────────
// Zero-dependency CLI for installing AI agent templates into OpenCode projects.
// Uses only Node.js 20+ built-in modules.
// ─────────────────────────────────────────────────────────────────────────────────

import { VERSION } from '../src/meta.mjs';

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

import { installAgents, uninstallAgents } from '../src/installer.mjs';

import {
  bold,
  dim,
  cyan,
  green,
  red,
  yellow,
  boldCyan,
  errorMessage,
  printAgentList,
  printPacksList,
  printSearchResults,
  header,
} from '../src/display.mjs';

import {
  findOutdatedAgents,
  verifyLockIntegrity,
  rehashLock,
  bootstrapLock,
} from '../src/lock.mjs';

import { parsePermissionFlags } from '../src/permissions/cli.mjs';
import { resolvePermissions } from '../src/permissions/resolve.mjs';
import { loadPreferences, savePreferences } from '../src/permissions/persistence.mjs';
import { displayWarning, requireConfirmation, getWarningsForPreset } from '../src/permissions/warnings.mjs';

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
  const rawArgs = argv.slice(2); // Remove node and script path

  // Normalize --flag=value to --flag value
  const raw = [];
  for (const arg of rawArgs) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const eqIdx = arg.indexOf('=');
      raw.push(arg.slice(0, eqIdx), arg.slice(eqIdx + 1));
    } else {
      raw.push(arg);
    }
  }
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
  opencode-agents install --update                 Reinstall outdated agents (hash mismatch)
  opencode-agents update                           Reinstall outdated agents (alias)
  opencode-agents list                            List all available agents
  opencode-agents list --packs                    List available packs
  opencode-agents search <query>                  Search agents
  opencode-agents uninstall <agent>               Uninstall a single agent
  opencode-agents uninstall --category <cat,...>   Uninstall all agents in categories
  opencode-agents uninstall --pack <pack,...>      Uninstall agents from packs
  opencode-agents uninstall --all                  Uninstall all agents
  opencode-agents verify                          Verify installed files match lock hashes
  opencode-agents rehash                          Rebuild lock file from installed files
  opencode-agents tui                             Interactive agent browser

${bold('Options:')}
  --force      Overwrite existing agent files
  --dry-run    Preview without writing files
  --update     Reinstall only outdated agents (use with install)
  --help       Show this help
  --version    Show version

${bold('Permission options:')}
  --permissions <preset>   Apply permission preset (strict|balanced|permissive|yolo)
  --yolo                   Set all permissions to allow (requires CONFIRM)
  --permission-override    Override specific permission (format: [agent:]perm=action)
  --save-permissions       Save permission choices as default
  --no-saved-permissions   Ignore saved permission preferences
  --no-interactive         Skip interactive permission editor

${bold('Examples:')}
  ${dim('$')} npx opencode-agents install postgres-pro
  ${dim('$')} npx opencode-agents install --category devops
  ${dim('$')} npx opencode-agents install --category languages,data-api
  ${dim('$')} npx opencode-agents install --pack backend
  ${dim('$')} npx opencode-agents install --pack backend,devops
  ${dim('$')} npx opencode-agents install --all
  ${dim('$')} npx opencode-agents search docker
  ${dim('$')} npx opencode-agents list --packs
  ${dim('$')} npx opencode-agents uninstall postgres-pro
  ${dim('$')} npx opencode-agents uninstall --category devops
  ${dim('$')} npx opencode-agents uninstall --all
  ${dim('$')} npx opencode-agents install --update
  ${dim('$')} npx opencode-agents verify
  ${dim('$')} npx opencode-agents rehash

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

/**
 * Resolve a single agent by name, with fuzzy suggestions on failure.
 * Prints an error and calls process.exit(1) if the agent is not found.
 * @param {string} name     Agent name to look up
 * @param {string} command  Command label for the usage hint (e.g. 'install', 'uninstall')
 * @returns {import('../src/registry.mjs').AgentEntry}
 */
function resolveAgentOrExit(name, command) {
  const agent = getAgent(name);
  if (!agent) {
    const suggestions = searchAgents(name);
    errorMessage(`Agent "${name}" not found.`);
    if (suggestions.length > 0) {
      console.error(`  Did you mean: ${suggestions.slice(0, 5).map((a) => boldCyan(a.name)).join(', ')}?`);
      console.error();
    }
    process.exit(1);
  }
  return agent;
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

  // Parse permission flags (wiring deferred to C4 integration)
  const rawArgs = process.argv.slice(2);
  const permissionFlags = parsePermissionFlags(rawArgs);

  // Resolve permissions (S4.29 — C4 integration)
  const savedPrefs = permissionFlags.noSavedPermissions ? null : loadPreferences();
  const resolvedPerms = resolvePermissions({
    savedPreferences: savedPrefs,
    cliPreset: permissionFlags.preset,
    cliYolo: permissionFlags.yolo,
    cliOverrides: permissionFlags.overrides,
  });

  // YOLO gate (S4.32): require typing CONFIRM
  if (permissionFlags.yolo) {
    const warnings = getWarningsForPreset('yolo');
    for (const w of warnings) displayWarning(w.level, w.title, w.message);
    const confirmed = await requireConfirmation('Type CONFIRM to enable YOLO mode: ');
    if (!confirmed) {
      process.stderr.write('YOLO mode cancelled.\n');
      process.exit(1);
    }
  }

  // Save preferences if requested
  if (permissionFlags.savePermissions && resolvedPerms) {
    savePreferences({ preset: permissionFlags.preset || undefined, overrides: permissionFlags.overrides });
  }

  // Guard: mutually exclusive install modes
  const modes = ['all', 'pack', 'category', 'update'].filter((f) => parsed.flags[f]);
  if (modes.length > 1) {
    errorMessage(`Cannot combine --${modes.join(' and --')}. Use one at a time.`);
    process.exit(1);
  }

  // --update: reinstall only outdated agents
  if (parsed.flags.update === true) {
    const manifest = getManifest();
    const outdated = findOutdatedAgents(manifest);
    if (outdated.length === 0) {
      header('All agents are up to date.');
      process.exit(0);
      return;
    }
    header(`Updating ${outdated.length} outdated agent(s)...`);
    for (const agent of outdated) {
      console.log(`  ${dim('→')} ${bold(agent.name)} — hash mismatch, reinstalling`);
    }
    console.log();
    const result = await installAgents(outdated, { force: true, dryRun, permissions: resolvedPerms });
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --all: install every agent
  if (parsed.flags.all === true) {
    const agents = listAll();
    header(`Installing all ${agents.length} agents...`);
    const result = await installAgents(agents, { ...options, permissions: resolvedPerms });
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
    const result = await installAgents(uniqueAgents, { ...options, permissions: resolvedPerms });
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
    const result = await installAgents(uniqueAgents, { ...options, permissions: resolvedPerms });
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

  const agent = resolveAgentOrExit(agentName, 'install');
  const result = await installAgents([agent], { ...options, permissions: resolvedPerms });
  process.exit(result.failed > 0 ? 1 : 0);
}

// ─── Command: uninstall ─────────────────────────────────────────────────────────

/**
 * Handle the "uninstall" command.
 * @param {ParsedArgs} parsed
 */
async function cmdUninstall(parsed) {
  const dryRun = Boolean(parsed.flags['dry-run']);
  const options = { dryRun };

  // Guard: mutually exclusive modes
  const modes = ['all', 'pack', 'category'].filter((f) => parsed.flags[f]);
  if (modes.length > 1) {
    errorMessage(`Cannot combine --${modes.join(' and --')}. Use one at a time.`);
    process.exit(1);
  }

  // --all: uninstall every agent
  if (parsed.flags.all === true) {
    const agents = listAll();
    header(`Uninstalling all ${agents.length} agents...`);
    const result = uninstallAgents(agents, options);
    console.log(`  ${result.removed} removed, ${result.not_found} not found, ${result.failed} failed`);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --category <name...>
  if (parsed.flags.category) {
    if (parsed.flags.category === true) {
      errorMessage('Missing category name. Usage: opencode-agents uninstall --category <name...>');
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

    header(`Uninstalling ${uniqueAgents.length} agents from ${formatLabel('category', catIds)}...`);
    const result = uninstallAgents(uniqueAgents, options);
    console.log(`  ${result.removed} removed, ${result.not_found} not found, ${result.failed} failed`);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // --pack <name...>
  if (parsed.flags.pack) {
    if (parsed.flags.pack === true) {
      errorMessage('Missing pack name. Usage: opencode-agents uninstall --pack <name...>');
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

    header(`Uninstalling ${formatLabel('pack', packNames)} (${uniqueAgents.length} agents)...`);
    const result = uninstallAgents(uniqueAgents, options);
    console.log(`  ${result.removed} removed, ${result.not_found} not found, ${result.failed} failed`);
    process.exit(result.failed > 0 ? 1 : 0);
    return;
  }

  // uninstall <agent-name>
  const agentName = parsed.args[0];
  if (!agentName) {
    errorMessage('Missing agent name. Usage: opencode-agents uninstall <agent>');
    console.error(`  Run ${cyan('opencode-agents list')} to see available agents.`);
    console.error();
    process.exit(1);
  }

  const agent = resolveAgentOrExit(agentName, 'uninstall');
  const result = uninstallAgents([agent], options);
  if (result.removed > 0) {
    console.log(`  Agent "${agentName}" removed.`);
  } else if (result.not_found > 0) {
    console.log(`  Agent "${agentName}" is not installed.`);
  } else {
    console.error(`  Failed to remove "${agentName}".`);
  }
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

// ─── Command: update ────────────────────────────────────────────────────────────

/**
 * Handle the "update" command (standalone alias for `install --update`).
 * Reinstall only agents whose installed file hash doesn't match the lock hash.
 * @param {ParsedArgs} parsed
 */
async function cmdUpdate(parsed) {
  const dryRun = Boolean(parsed.flags['dry-run']);
  const manifest = getManifest();
  const outdated = findOutdatedAgents(manifest);

  if (outdated.length === 0) {
    header('All agents are up to date.');
    process.exit(0);
    return;
  }

  // Resolve permissions (same as cmdInstall)
  const rawArgs = process.argv.slice(2);
  const permissionFlags = parsePermissionFlags(rawArgs);
  const savedPrefs = permissionFlags.noSavedPermissions ? null : loadPreferences();
  const resolvedPerms = resolvePermissions({
    savedPreferences: savedPrefs,
    cliPreset: permissionFlags.preset,
    cliYolo: permissionFlags.yolo,
    cliOverrides: permissionFlags.overrides,
  });

  if (permissionFlags.savePermissions && resolvedPerms) {
    savePreferences({ preset: permissionFlags.preset || undefined, overrides: permissionFlags.overrides });
  }

  header(`Updating ${outdated.length} outdated agent(s)...`);
  for (const agent of outdated) {
    console.log(`  ${dim('→')} ${bold(agent.name)} — hash mismatch, reinstalling`);
  }
  console.log();

  const result = await installAgents(outdated, { force: true, dryRun, permissions: resolvedPerms });
  process.exit(result.failed > 0 ? 1 : 0);
}

// ─── Command: verify ────────────────────────────────────────────────────────────

/**
 * Handle the "verify" command.
 * Verify installed files match their lock file hashes.
 */
function cmdVerify() {
  const manifest = getManifest();
  const { ok, mismatch, missing } = verifyLockIntegrity(manifest);

  header('Lock integrity verification');

  if (ok.length > 0) {
    console.log(`  ${green('✓')} ${bold(String(ok.length))} agent(s) OK`);
    for (const name of ok) {
      console.log(`    ${dim('•')} ${name}`);
    }
  }

  if (mismatch.length > 0) {
    console.log(`  ${red('✗')} ${bold(String(mismatch.length))} agent(s) with hash mismatch`);
    for (const name of mismatch) {
      console.log(`    ${dim('•')} ${name}`);
    }
  }

  if (missing.length > 0) {
    console.log(`  ${yellow('⚠')} ${bold(String(missing.length))} agent(s) missing from disk`);
    for (const name of missing) {
      console.log(`    ${dim('•')} ${name}`);
    }
  }

  if (ok.length === 0 && mismatch.length === 0 && missing.length === 0) {
    console.log(`  ${dim('No lock entries found. Run install first.')}`);
  }

  console.log();
  process.exit(mismatch.length > 0 || missing.length > 0 ? 1 : 0);
}

// ─── Command: rehash ────────────────────────────────────────────────────────────

/**
 * Handle the "rehash" command.
 * Rebuild the lock file from disk — scan all installed agents and recompute hashes.
 */
function cmdRehash() {
  const manifest = getManifest();
  const count = rehashLock(manifest);

  header('Lock file rebuilt from disk');
  console.log(`  ${green('✓')} ${bold(String(count))} agent(s) rehashed`);
  console.log();
  process.exit(0);
}

// ─── Main Router ────────────────────────────────────────────────────────────────

async function main() {
  const parsed = parseArgs(process.argv);

  // Warn about unknown flags (don't error — just inform)
  const KNOWN_FLAGS = new Set([
    'help', 'version', 'dry-run', 'force',
    'category', 'pack', 'all', 'packs', 'update',
    'yolo', 'permissions', 'permission-override',
    'save-permissions', 'no-saved-permissions', 'no-interactive',
  ]);
  const unknownFlags = Object.keys(parsed.flags).filter((f) => !KNOWN_FLAGS.has(f));
  if (unknownFlags.length > 0) {
    console.error(`Warning: unknown flag(s): ${unknownFlags.map((f) => '--' + f).join(', ')}`);
  }

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

    case 'update':
      await cmdUpdate(parsed);
      break;

    case 'verify':
      cmdVerify();
      break;

    case 'rehash':
      cmdRehash();
      break;

    case 'list':
    case 'ls':
      cmdList(parsed);
      break;

    case 'search':
    case 'find':
      cmdSearch(parsed);
      break;

    case 'uninstall':
    case 'remove':
    case 'rm':
      await cmdUninstall(parsed);
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
