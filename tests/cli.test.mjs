import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const CLI = join(ROOT, 'bin', 'cli.mjs');

/**
 * Run the CLI and return stdout.
 * @param {string[]} args
 * @param {{ cwd?: string; expectError?: boolean }} options
 * @returns {string}
 */
function run(args, { cwd, expectError = false } = {}) {
  try {
    const result = execFileSync('node', [CLI, ...args], {
      cwd: cwd ?? ROOT,
      encoding: 'utf-8',
      timeout: 15_000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return result;
  } catch (err) {
    if (expectError) {
      return /** @type {any} */ (err).stdout + /** @type {any} */ (err).stderr;
    }
    throw err;
  }
}

// ─── --version ──────────────────────────────────────────────────────────────────

describe('CLI --version', () => {
  it('should print version number', () => {
    const output = run(['--version']);
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));
    assert.equal(output.trim(), pkg.version);
  });
});

// ─── --help ─────────────────────────────────────────────────────────────────────

describe('CLI --help', () => {
  it('should display usage information', () => {
    const output = run(['--help']);
    assert.ok(output.includes('opencode-agents'));
    assert.ok(output.includes('install'));
    assert.ok(output.includes('list'));
    assert.ok(output.includes('search'));
    assert.ok(output.includes('--force'));
    assert.ok(output.includes('--dry-run'));
  });

  it('should show help when no command is given', () => {
    const output = run([]);
    assert.ok(output.includes('opencode-agents'));
    assert.ok(output.includes('Usage:'));
  });

  it('should show help with "help" command', () => {
    const output = run(['help']);
    assert.ok(output.includes('Usage:'));
  });
});

// ─── list ───────────────────────────────────────────────────────────────────────

describe('CLI list', () => {
  it('should list all agents grouped by category', () => {
    const output = run(['list']);
    assert.ok(output.includes('agents available'));
    assert.ok(output.includes('postgres-pro'));
    assert.ok(output.includes('typescript-pro'));
    assert.ok(output.includes('AI & Machine Learning'));
    assert.ok(output.includes('DevOps & Infrastructure'));
  });

  it('should list packs with --packs flag', () => {
    const output = run(['list', '--packs']);
    assert.ok(output.includes('backend'));
    assert.ok(output.includes('frontend'));
    assert.ok(output.includes('devops'));
    assert.ok(output.includes('fullstack'));
    assert.ok(output.includes('available packs'));
  });
});

// ─── search ─────────────────────────────────────────────────────────────────────

describe('CLI search', () => {
  it('should find agents by name', () => {
    const output = run(['search', 'postgres']);
    assert.ok(output.includes('postgres-pro'));
  });

  it('should find agents by tag', () => {
    const output = run(['search', 'docker']);
    assert.ok(output.includes('docker-specialist'));
  });

  it('should find agents by description keyword', () => {
    const output = run(['search', 'kubernetes']);
    assert.ok(output.includes('kubernetes-specialist'));
  });

  it('should show no results for nonsense query', () => {
    const output = run(['search', 'xyzzy123nonexistent']);
    assert.ok(output.includes('No agents found'));
  });

  it('should error when no query provided', () => {
    const output = run(['search'], { expectError: true });
    assert.ok(output.includes('Missing search query'));
  });
});

// ─── install ────────────────────────────────────────────────────────────────────

describe('CLI install', () => {
  const TEMP_DIR = join(ROOT, '.test-workspace');

  beforeEach(() => {
    mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('should error when no agent name provided', () => {
    const output = run(['install'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Missing agent name'));
  });

  it('should error for unknown agent', () => {
    const output = run(['install', 'nonexistent-agent-xyz'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('not found'));
  });

  it('should suggest similar agents for typos', () => {
    const output = run(['install', 'postgres'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('not found'));
    assert.ok(output.includes('postgres-pro'));
  });

  it('should error for unknown category', () => {
    const output = run(['install', '--category', 'nonexistent'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Unknown category'));
  });

  it('should error for unknown pack', () => {
    const output = run(['install', '--pack', 'nonexistent'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Unknown pack'));
  });

  it('should dry-run a single agent install', () => {
    const output = run(['install', 'postgres-pro', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));
    // Verify no files were created
    assert.ok(!existsSync(join(TEMP_DIR, '.opencode', 'agents', 'database', 'postgres-pro.md')));
  });

  it('should dry-run a category install', () => {
    const output = run(['install', '--category', 'database', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));
    assert.ok(output.includes('redis-specialist'));
    assert.ok(output.includes('database-architect'));
  });

  it('should dry-run a pack install', () => {
    const output = run(['install', '--pack', 'security', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('security-auditor'));
    assert.ok(output.includes('penetration-tester'));
  });

  it('should dry-run --all install', () => {
    const output = run(['install', '--all', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));
    assert.ok(output.includes('typescript-pro'));
  });

  it('should dry-run primary agent placement at root agents dir', () => {
    const output = run(['install', 'cloud-architect', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('cloud-architect'));
    // Primary agents should NOT be in a subdirectory
    assert.ok(output.includes('.opencode'));
  });
});

// ─── Unknown command ────────────────────────────────────────────────────────────

describe('CLI unknown command', () => {
  it('should error for unknown command', () => {
    const output = run(['foobar'], { expectError: true });
    assert.ok(output.includes('Unknown command'));
  });
});

// ─── Registry module ────────────────────────────────────────────────────────────

describe('Registry module', () => {
  it('should load manifest without error', async () => {
    const { loadManifest } = await import('../src/registry.mjs');
    const manifest = loadManifest();
    assert.ok(manifest.agents.length > 0);
    assert.ok(manifest.version);
    assert.ok(manifest.categories);
    assert.ok(manifest.packs);
  });

  it('should find agent by name', async () => {
    const { getAgent } = await import('../src/registry.mjs');
    const agent = getAgent('postgres-pro');
    assert.ok(agent);
    assert.equal(agent.name, 'postgres-pro');
    assert.equal(agent.category, 'database');
  });

  it('should return undefined for unknown agent', async () => {
    const { getAgent } = await import('../src/registry.mjs');
    const agent = getAgent('nonexistent-agent');
    assert.equal(agent, undefined);
  });

  it('should get agents by category', async () => {
    const { getCategory } = await import('../src/registry.mjs');
    const agents = getCategory('database');
    assert.ok(agents.length >= 3);
    assert.ok(agents.every((a) => a.category === 'database'));
  });

  it('should resolve pack agents', async () => {
    const { resolvePackAgents } = await import('../src/registry.mjs');
    const agents = resolvePackAgents('backend');
    assert.ok(agents.length > 0);
    assert.ok(agents.some((a) => a.name === 'postgres-pro'));
  });

  it('should search agents by name', async () => {
    const { searchAgents } = await import('../src/registry.mjs');
    const results = searchAgents('docker');
    assert.ok(results.length > 0);
    assert.ok(results.some((a) => a.name === 'docker-specialist'));
  });

  it('should search agents by tag', async () => {
    const { searchAgents } = await import('../src/registry.mjs');
    const results = searchAgents('kubernetes');
    assert.ok(results.length > 0);
    assert.ok(results.some((a) => a.name === 'kubernetes-specialist'));
  });

  it('should list all agents', async () => {
    const { listAll } = await import('../src/registry.mjs');
    const agents = listAll();
    assert.ok(agents.length >= 40);
  });
});

// ─── Command aliases ────────────────────────────────────────────────────────────

describe('CLI command aliases', () => {
  it('should accept "ls" as alias for "list"', () => {
    const output = run(['ls']);
    assert.ok(output.includes('agents available'));
  });

  it('should accept "i" as alias for "install" with --dry-run', () => {
    const output = run(['i', 'postgres-pro', '--dry-run']);
    assert.ok(output.includes('postgres-pro'));
  });

  it('should accept "find" as alias for "search"', () => {
    const output = run(['find', 'typescript']);
    assert.ok(output.includes('typescript-pro'));
  });
});
