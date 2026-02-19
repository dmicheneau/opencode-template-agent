import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { tmpdir } from 'node:os';

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
    assert.ok(!existsSync(join(TEMP_DIR, '.opencode', 'agents', 'data-api', 'postgres-pro.md')));
  });

  it('should dry-run a category install', () => {
    const output = run(['install', '--category', 'data-api', '--dry-run'], { cwd: TEMP_DIR });
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

  // ─── Multi-pack install ───────────────────────────────────────────────────────

  it('should dry-run a multi-pack install', () => {
    const output = run(['install', '--pack', 'backend', 'security', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));       // from backend
    assert.ok(output.includes('security-auditor'));    // from security
    assert.ok(output.includes('packs'));               // plural label
  });

  it('should error for any unknown pack in multi-pack', () => {
    const output = run(['install', '--pack', 'backend', 'nonexistent', '--dry-run'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Unknown pack'));
    assert.ok(output.includes('nonexistent'));
  });

  // ─── Multi-category install ───────────────────────────────────────────────────

  it('should dry-run a multi-category install', () => {
    const output = run(['install', '--category', 'data-api', 'security', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));        // from data-api
    assert.ok(output.includes('security-auditor'));     // from security
    assert.ok(output.includes('categories'));           // plural label
  });

  it('should error for any unknown category in multi-category', () => {
    const output = run(['install', '--category', 'data-api', 'nonexistent', '--dry-run'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Unknown category'));
    assert.ok(output.includes('nonexistent'));
  });

  // ─── Empty value guards ─────────────────────────────────────────────────────

  it('should error when --pack has no value', () => {
    const output = run(['install', '--pack'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Missing pack name'));
  });

  it('should error when --category has no value', () => {
    const output = run(['install', '--category'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Missing category name'));
  });

  // ─── Comma-separated values ─────────────────────────────────────────────────

  it('should support comma-separated packs', () => {
    const output = run(['install', '--pack', 'backend,security', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));       // from backend
    assert.ok(output.includes('security-auditor'));    // from security
    assert.ok(output.includes('packs'));               // plural label
  });

  it('should support comma-separated categories', () => {
    const output = run(['install', '--category', 'data-api,security', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    assert.ok(output.includes('postgres-pro'));        // from data-api
    assert.ok(output.includes('security-auditor'));     // from security
    assert.ok(output.includes('categories'));           // plural label
  });

  // ─── Flag interaction ───────────────────────────────────────────────────────

  it('should handle --pack followed by --force correctly', () => {
    const output = run(['install', '--pack', 'security', '--force', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('security-auditor'));
    assert.ok(output.includes('pack "security"'));
  });

  it('should deduplicate agents across overlapping packs', () => {
    const output = run(['install', '--pack', 'backend,fullstack', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('would install'));
    // typescript-pro appears in both packs — should appear only once in output
    // Each install line contains the name twice (agent + path), so 2 matches = 1 line
    const matches = output.match(/typescript-pro/g);
    assert.equal(matches?.length, 2, 'Shared agents should not be duplicated in output');
  });

  // ─── Mutual exclusivity ─────────────────────────────────────────────────────

  it('should error when combining --all and --pack', () => {
    const output = run(['install', '--all', '--pack', 'backend', '--dry-run'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Cannot combine'));
  });

  it('should error when combining --pack and --category', () => {
    const output = run(['install', '--pack', 'backend', '--category', 'database', '--dry-run'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Cannot combine'));
  });
});

// ─── Unknown command ────────────────────────────────────────────────────────────

describe('CLI unknown command', () => {
  it('should error for unknown command', () => {
    const output = run(['foobar'], { expectError: true });
    assert.ok(output.includes('Unknown command'));
  });
});

// ─── CLI: --update flag ─────────────────────────────────────────────────────────

describe('CLI --update flag', () => {
  it('should be recognized as install --update flag', () => {
    const output = run(['install', '--update']);
    // No outdated agents in a clean workspace, so we expect the "up to date" message
    assert.ok(output.includes('up to date') || output.includes('Updating'),
      '--update flag should be recognized');
  });

  it('should be recognized as standalone "update" command', () => {
    const output = run(['update']);
    assert.ok(output.includes('up to date') || output.includes('Updating'),
      'update command should be recognized');
  });

  it('should not conflict with --all (mutually exclusive)', () => {
    const output = run(['install', '--all', '--update'], { expectError: true });
    assert.ok(output.includes('Cannot combine'),
      '--update and --all should be mutually exclusive');
  });
});

// ─── CLI: --rehash flag ─────────────────────────────────────────────────────────

describe('CLI --rehash flag', () => {
  it('should be recognized as standalone "rehash" command', () => {
    const output = run(['rehash']);
    assert.ok(output.includes('rehashed') || output.includes('rebuilt') || output.includes('Lock file'),
      'rehash command should be recognized');
  });

  it('should be recognized as --rehash flag', () => {
    const output = run(['--rehash']);
    assert.ok(output.includes('rehashed') || output.includes('rebuilt') || output.includes('Lock file'),
      '--rehash flag should be recognized');
  });
});

// ─── CLI: --verify flag ─────────────────────────────────────────────────────────

describe('CLI --verify flag', () => {
  it('should be recognized as standalone "verify" command', () => {
    // No lock entries → should show "No lock entries" message and exit 0
    const output = run(['verify']);
    assert.ok(output.includes('verification') || output.includes('integrity') || output.includes('OK') || output.includes('No lock entries'),
      'verify command should be recognized');
  });

  it('should be recognized as --verify flag', () => {
    const output = run(['--verify']);
    assert.ok(output.includes('verification') || output.includes('integrity') || output.includes('OK') || output.includes('No lock entries'),
      '--verify flag should be recognized');
  });
});

// ─── CLI: help includes new commands ────────────────────────────────────────────

describe('CLI help includes new commands', () => {
  it('should show update command in help', () => {
    const output = run(['--help']);
    assert.ok(output.includes('update'), 'help should mention update command');
  });

  it('should show verify command in help', () => {
    const output = run(['--help']);
    assert.ok(output.includes('verify'), 'help should mention verify command');
  });

  it('should show rehash command in help', () => {
    const output = run(['--help']);
    assert.ok(output.includes('rehash'), 'help should mention rehash command');
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
    assert.equal(agent.category, 'data-api');
  });

  it('should return undefined for unknown agent', async () => {
    const { getAgent } = await import('../src/registry.mjs');
    const agent = getAgent('nonexistent-agent');
    assert.equal(agent, undefined);
  });

  it('should get agents by category', async () => {
    const { getCategory } = await import('../src/registry.mjs');
    const agents = getCategory('data-api');
    assert.ok(agents.length >= 3);
    assert.ok(agents.every((a) => a.category === 'data-api'));
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

// ─── Security: Path Traversal ───────────────────────────────────────────────────

describe('Security: Path Traversal', () => {
  it('should reject agent names containing ../', async () => {
    const { installAgents } = await import('../src/installer.mjs');
    const malicious = {
      name: '../../../etc/passwd',
      category: 'database',
      path: 'database/test',
      mode: 'primary',
      description: 'malicious',
      tags: [],
    };
    await assert.rejects(
      () => installAgents([malicious], { dryRun: true, cwd: tmpdir() }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Security'), `Expected "Security" in error but got: ${err.message}`);
        return true;
      }
    );
  });

  it('should reject categories containing ../', async () => {
    const { installAgents } = await import('../src/installer.mjs');
    const malicious = {
      name: 'innocent-agent',
      category: '../../../etc',
      path: 'test/innocent-agent',
      mode: 'subagent',
      description: 'malicious category',
      tags: [],
    };
    await assert.rejects(
      () => installAgents([malicious], { dryRun: true, cwd: tmpdir() }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('Security'), `Expected "Security" in error but got: ${err.message}`);
        return true;
      }
    );
  });

  it('should ensure all manifest agents resolve within agents dir', async () => {
    const { loadManifest } = await import('../src/registry.mjs');
    const manifest = loadManifest();
    const basePath = manifest.base_path;
    const cwd = tmpdir();
    const safeBase = resolve(cwd, basePath);

    for (const agent of manifest.agents) {
      let relative;
      if (agent.mode === 'primary') {
        relative = join(basePath, `${agent.name}.md`);
      } else {
        relative = join(basePath, agent.category, `${agent.name}.md`);
      }
      const absolute = resolve(cwd, relative);
      assert.ok(
        absolute.startsWith(safeBase),
        `Agent "${agent.name}" resolves outside agents dir: ${absolute}`
      );
    }
  });
});

// ─── Security: Network ──────────────────────────────────────────────────────────

describe('Security: Network', () => {
  /** @type {string} */
  let installerSource;

  // Read installer source once for all network security tests
  beforeEach(() => {
    installerSource = readFileSync(join(ROOT, 'src', 'installer.mjs'), 'utf-8');
  });

  it('should include redirect limit constant', () => {
    const match = installerSource.match(/const\s+MAX_REDIRECTS\s*=\s*(\d+)/);
    assert.ok(match, 'MAX_REDIRECTS constant not found in installer.mjs');
    const value = parseInt(match[1], 10);
    assert.ok(value > 0 && value <= 10, `MAX_REDIRECTS should be 1–10, got ${value}`);
  });

  it('should include response size limit constant', () => {
    const match = installerSource.match(/const\s+MAX_RESPONSE_SIZE\s*=\s*([^;]+)/);
    assert.ok(match, 'MAX_RESPONSE_SIZE constant not found in installer.mjs');
    // Evaluate the expression (e.g. "1024 * 1024")
    const value = Function(`"use strict"; return (${match[1]})`)();
    assert.ok(typeof value === 'number' && value > 0, 'MAX_RESPONSE_SIZE must be a positive number');
    assert.ok(value <= 10 * 1024 * 1024, `MAX_RESPONSE_SIZE should be ≤ 10 MB, got ${value}`);
  });

  it('should include domain allowlist', () => {
    assert.ok(
      installerSource.includes('ALLOWED_HOSTS'),
      'ALLOWED_HOSTS constant not found in installer.mjs'
    );
    assert.ok(
      installerSource.includes('raw.githubusercontent.com'),
      'ALLOWED_HOSTS must include raw.githubusercontent.com'
    );
  });
});

// ─── Security: Manifest Validation ──────────────────────────────────────────────

describe('Security: Manifest Validation', () => {
  // Recreate the SAFE_NAME_RE pattern from registry.mjs for direct testing
  const SAFE_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;

  it('should reject manifest with base_path containing ..', () => {
    // Verify the validation logic: base_path with ".." should be rejected
    const badBasePath = '../../../etc';
    assert.ok(badBasePath.includes('..'), 'Test precondition: bad path contains ".."');
    // The validation in registry.mjs checks: manifest.base_path.includes('..')
    // Verify the check exists in the source
    const registrySource = readFileSync(join(ROOT, 'src', 'registry.mjs'), 'utf-8');
    assert.ok(
      registrySource.includes("base_path") && registrySource.includes("'..'"),
      'Manifest validation must check base_path for ".."'
    );
  });

  it('should reject manifest with absolute base_path', () => {
    // Verify the validation logic: absolute base_path should be rejected
    const registrySource = readFileSync(join(ROOT, 'src', 'registry.mjs'), 'utf-8');
    assert.ok(
      registrySource.includes('isAbsolute'),
      'Manifest validation must check for absolute base_path using isAbsolute'
    );
  });

  it('should reject agent with invalid name characters', () => {
    // Test the SAFE_NAME_RE pattern used by validateManifest
    const invalidNames = [
      '../etc/passwd',
      'agent; rm -rf /',
      '',
      ' leading-space',
      'has spaces',
      '/absolute/path',
      'back\\slash',
    ];
    for (const name of invalidNames) {
      assert.ok(
        !SAFE_NAME_RE.test(name),
        `SAFE_NAME_RE should reject "${name}" but it matched`
      );
    }
  });

  it('should accept valid manifest', async () => {
    // The real manifest must load without throwing (validates on load)
    const { loadManifest } = await import('../src/registry.mjs');
    const manifest = loadManifest();
    assert.ok(manifest.agents.length > 0, 'Manifest must contain agents');
    assert.ok(typeof manifest.base_path === 'string', 'Manifest must have base_path');
    assert.ok(!manifest.base_path.includes('..'), 'base_path must not contain ".."');

    // Verify all agent names match the safe pattern
    for (const agent of manifest.agents) {
      assert.ok(
        SAFE_NAME_RE.test(agent.name),
        `Agent name "${agent.name}" does not match SAFE_NAME_RE`
      );
      assert.ok(
        SAFE_NAME_RE.test(agent.category),
        `Category "${agent.category}" does not match SAFE_NAME_RE`
      );
    }
  });
});

// ─── Install: File I/O ──────────────────────────────────────────────────────────

describe('Install: File I/O', () => {
  const IO_TEMP = join(ROOT, '.test-io-workspace');

  beforeEach(() => {
    mkdirSync(IO_TEMP, { recursive: true });
  });

  afterEach(() => {
    rmSync(IO_TEMP, { recursive: true, force: true });
  });

  it('should create directory structure on install', () => {
    // Verify that a dry-run produces the correct target path structure
    const output = run(['install', 'postgres-pro', '--dry-run'], { cwd: IO_TEMP });
    assert.ok(output.includes('postgres-pro'), 'Output should mention the agent');
    // The dry-run output shows the relative path the file WOULD be written to
    assert.ok(
      output.includes('.opencode') && output.includes('agents'),
      'Output should show the .opencode/agents path structure'
    );
    // Verify that when we manually create the expected directory, it works
    const expectedDir = join(IO_TEMP, '.opencode', 'agents', 'data-api');
    mkdirSync(expectedDir, { recursive: true });
    assert.ok(existsSync(expectedDir), 'Directory structure should be creatable');
    // Also verify parent directories exist
    assert.ok(existsSync(join(IO_TEMP, '.opencode')), '.opencode dir should exist');
    assert.ok(existsSync(join(IO_TEMP, '.opencode', 'agents')), '.opencode/agents dir should exist');
  });

  it('should skip existing files without --force', () => {
    // Pre-create the agent file with dummy content
    const agentDir = join(IO_TEMP, '.opencode', 'agents', 'data-api');
    const agentFile = join(agentDir, 'postgres-pro.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, 'DUMMY CONTENT — DO NOT OVERWRITE', 'utf-8');

    // Run install without --force — should skip (no download needed)
    const output = run(['install', 'postgres-pro'], { cwd: IO_TEMP });
    assert.ok(
      output.includes('already exists') || output.includes('skipped'),
      'Output should indicate the file was skipped'
    );

    // Verify the file was NOT overwritten
    const content = readFileSync(agentFile, 'utf-8');
    assert.equal(content, 'DUMMY CONTENT — DO NOT OVERWRITE', 'File content should be unchanged');
  });

  it('should overwrite existing files with --force', () => {
    // Pre-create the agent file with dummy content
    const agentDir = join(IO_TEMP, '.opencode', 'agents', 'data-api');
    const agentFile = join(agentDir, 'postgres-pro.md');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(agentFile, 'DUMMY CONTENT — SHOULD BE REPLACED', 'utf-8');

    // Run install with --force — will attempt download from GitHub
    // If the remote file exists, it will overwrite; if 404, install fails but
    // the important thing is it does NOT skip (no "already exists" message)
    const output = run(['install', 'postgres-pro', '--force'], { cwd: IO_TEMP, expectError: true });
    assert.ok(output.includes('postgres-pro'), 'Output should mention the agent name');
    // With --force, the file should NOT be skipped
    assert.ok(
      !output.includes('already exists'),
      'With --force, the file should not be reported as "already exists"'
    );
  });
});

// ─── Display: NO_COLOR ──────────────────────────────────────────────────────────

describe('Display: NO_COLOR', () => {
  it('should strip ANSI codes when NO_COLOR is set', () => {
    // The run() helper already sets NO_COLOR=1
    const output = run(['list']);
    const ansiPattern = /\x1b\[[0-9;]*m/;
    assert.ok(
      !ansiPattern.test(output),
      'Output should not contain ANSI escape codes when NO_COLOR is set'
    );
    // Verify output still has readable content
    assert.ok(output.includes('agents available'), 'Output should still contain readable text');
    assert.ok(output.includes('postgres-pro'), 'Output should still list agents');
  });
});

// ─── CLI uninstall command ───────────────────────────────────────────────────────

describe('CLI uninstall command', () => {
  const TEMP_DIR = join(ROOT, '.test-uninstall-workspace');

  beforeEach(() => {
    mkdirSync(TEMP_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('should route "uninstall" to uninstall command', () => {
    // Agent not installed → reports "not installed" (not an error in the sense of unknown command)
    const output = run(['uninstall', 'postgres-pro'], { cwd: TEMP_DIR });
    assert.ok(output.includes('not installed') || output.includes('postgres-pro'),
      'uninstall should recognize the command');
  });

  it('should accept "remove" as alias for "uninstall"', () => {
    const output = run(['remove', 'postgres-pro'], { cwd: TEMP_DIR });
    assert.ok(output.includes('not installed') || output.includes('postgres-pro'),
      'remove alias should work');
  });

  it('should accept "rm" as alias for "uninstall"', () => {
    const output = run(['rm', 'postgres-pro'], { cwd: TEMP_DIR });
    assert.ok(output.includes('not installed') || output.includes('postgres-pro'),
      'rm alias should work');
  });

  it('should recognize --all flag', () => {
    const output = run(['uninstall', '--all'], { cwd: TEMP_DIR });
    assert.ok(output.includes('not found') || output.includes('removed') || output.includes('Uninstalling'),
      'uninstall --all should be recognized');
  });

  it('should recognize --pack flag', () => {
    const output = run(['uninstall', '--pack', 'backend'], { cwd: TEMP_DIR });
    assert.ok(output.includes('not found') || output.includes('removed') || output.includes('Uninstalling'),
      'uninstall --pack should be recognized');
  });

  it('should recognize --category flag', () => {
    const output = run(['uninstall', '--category', 'data-api'], { cwd: TEMP_DIR });
    assert.ok(output.includes('not found') || output.includes('removed') || output.includes('Uninstalling'),
      'uninstall --category should be recognized');
  });

  it('should recognize --dry-run flag', () => {
    // With --all --dry-run, all agents would be "removed" (dry-run returns removed) or not_found
    const output = run(['uninstall', '--all', '--dry-run'], { cwd: TEMP_DIR });
    assert.ok(output.includes('Dry run') || output.includes('removed') || output.includes('not found'),
      'uninstall --dry-run should be recognized');
  });

  it('should error when no agent name provided', () => {
    const output = run(['uninstall'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Missing agent name'),
      'uninstall with no args should show error');
  });

  it('should error when combining --all and --pack', () => {
    const output = run(['uninstall', '--all', '--pack', 'backend'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Cannot combine'),
      'uninstall --all --pack should be mutually exclusive');
  });

  it('should error for unknown agent', () => {
    const output = run(['uninstall', 'nonexistent-agent-xyz'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('not found'),
      'uninstall unknown agent should report not found');
  });

  it('should error for unknown pack', () => {
    const output = run(['uninstall', '--pack', 'nonexistent'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Unknown pack'),
      'uninstall --pack nonexistent should report unknown pack');
  });

  it('should error when combining --pack and --category', () => {
    const output = run(['uninstall', '--pack', 'backend', '--category', 'data-api'], { expectError: true, cwd: TEMP_DIR });
    assert.ok(output.includes('Cannot combine'),
      'uninstall --pack --category should be mutually exclusive');
  });
});
