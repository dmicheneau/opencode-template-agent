import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, chmodSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  sha256,
  getLockPath,
  readLock,
  writeLock,
  recordInstall,
  removeLockEntry,
  detectAgentStates,
  detectInstalledSet,
  bootstrapLock,
  findOutdatedAgents,
  verifyLockIntegrity,
  rehashLock,
  isValidLockEntry,
} from '../src/lock.mjs';

// ─── Test helpers ────────────────────────────────────────────────────────────

/**
 * Build a minimal manifest for testing.
 * @param {Array<Partial<import('../src/registry.mjs').Agent>>} agents
 * @returns {import('../src/registry.mjs').Manifest}
 */
function makeManifest(agents = []) {
  return {
    version: '1.0.0',
    generated: '2025-01-01T00:00:00Z',
    base_path: '.opencode/agents',
    agents: agents.map(a => ({
      name: a.name || 'test-agent',
      title: a.title || 'Test',
      description: a.description || 'test',
      category: a.category || 'general',
      source: a.source || 'https://example.com/test.md',
      mode: a.mode || 'subagent',
      ...a,
    })),
    packs: [],
  };
}

/**
 * Write a fake agent file to disk.
 * Primary agents go to `{cwd}/{basePath}/{name}.md`,
 * subagents go to `{cwd}/{basePath}/{category}/{name}.md`.
 */
function writeAgentFile(cwd, agent, content = '# Agent') {
  const basePath = '.opencode/agents';
  const filePath = agent.mode === 'primary'
    ? join(cwd, basePath, `${agent.name}.md`)
    : join(cwd, basePath, agent.category || 'general', `${agent.name}.md`);
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Run `fn` while capturing everything written to stderr.
 * Returns the concatenated output as a string.
 */
function captureStderr(fn) {
  const chunks = [];
  const orig = process.stderr.write;
  process.stderr.write = (chunk) => { chunks.push(String(chunk)); return true; };
  try { fn(); } finally { process.stderr.write = orig; }
  return chunks.join('');
}

// ─── sha256 ──────────────────────────────────────────────────────────────────

describe('sha256', () => {
  it('should return a deterministic hash for the same input', () => {
    const hash1 = sha256('hello world');
    const hash2 = sha256('hello world');
    assert.equal(hash1, hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = sha256('hello');
    const hash2 = sha256('world');
    assert.notEqual(hash1, hash2);
  });

  it('should return a 64-character hex string', () => {
    const hash = sha256('test content');
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('should handle empty string', () => {
    const hash = sha256('');
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('should handle Buffer input', () => {
    const fromString = sha256('binary test');
    const fromBuffer = sha256(Buffer.from('binary test'));
    assert.equal(fromString, fromBuffer);
  });
});

// ─── getLockPath ─────────────────────────────────────────────────────────────

describe('getLockPath', () => {
  it('should return correct path with explicit cwd', () => {
    const p = getLockPath('/tmp/my-project');
    assert.equal(p, join('/tmp/my-project', '.opencode', 'agents', '.manifest-lock.json'));
  });

  it('should include .opencode/agents/.manifest-lock.json', () => {
    const p = getLockPath('/any/path');
    assert.ok(p.endsWith(join('.opencode', 'agents', '.manifest-lock.json')));
  });

  it('should default to process.cwd()', () => {
    const p = getLockPath();
    assert.ok(p.startsWith(process.cwd()));
    assert.ok(p.endsWith('.manifest-lock.json'));
  });

  // ─── M-1: getLockPath accepts optional basePath parameter ──────────────

  it('M-1: should use default .opencode/agents when basePath is omitted', () => {
    const p = getLockPath('/tmp/test-project');
    assert.ok(p.includes(join('.opencode', 'agents')), 'default basePath should be .opencode/agents');
    assert.equal(p, join('/tmp/test-project', '.opencode', 'agents', '.manifest-lock.json'));
  });

  it('M-1: should use custom basePath when provided', () => {
    const p = getLockPath('/tmp/test-project', 'custom/path');
    assert.equal(p, join('/tmp/test-project', 'custom', 'path', '.manifest-lock.json'));
    assert.ok(!p.includes('.opencode'), 'custom basePath should override default');
  });
});

// ─── readLock ────────────────────────────────────────────────────────────────

describe('readLock', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-read-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return {} when lock file does not exist', () => {
    const data = readLock(tmp);
    assert.deepEqual(data, {});
  });

  it('should return {} for invalid JSON', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, '<<< not json >>>', 'utf-8');
    const data = readLock(tmp);
    assert.deepEqual(data, {});
  });

  it('should return {} for JSON array', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, '[1, 2, 3]', 'utf-8');
    const data = readLock(tmp);
    assert.deepEqual(data, {});
  });

  it('should return {} for JSON null', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, 'null', 'utf-8');
    const data = readLock(tmp);
    assert.deepEqual(data, {});
  });

  it('should return {} for JSON string', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, '"just a string"', 'utf-8');
    const data = readLock(tmp);
    assert.deepEqual(data, {});
  });

  it('should return parsed data for valid lock file', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    const lockData = {
      'my-agent': {
        sha256: 'abc123',
        installedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    };
    writeFileSync(lockPath, JSON.stringify(lockData), 'utf-8');
    const data = readLock(tmp);
    assert.deepEqual(data, lockData);
  });

  // ─── M-5: readLock warns on corrupted JSON ──────────────────────────────

  it('M-5: should write warning to stderr when lock file is corrupted', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, '<<< corrupted garbage >>>', 'utf-8');

    let data;
    const output = captureStderr(() => { data = readLock(tmp); });
    assert.deepEqual(data, {}, 'corrupted lock should return {}');
    assert.ok(output.length > 0, 'should have written to stderr');
    assert.ok(output.includes('corrupted') || output.includes('Warning'),
      `stderr should mention corruption, got: ${output}`);
  });

  // ─── M-6: readLock filters out invalid entries ────────────────────────────

  it('M-6: should filter out invalid entries and keep only valid ones', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    const mixed = {
      'valid-agent': { sha256: 'abc123', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      'missing-sha': { installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      'null-entry': null,
      'string-entry': 'just a string',
      'number-entry': 42,
      'valid-minimal': { sha256: 'def456' },
    };
    writeFileSync(lockPath, JSON.stringify(mixed), 'utf-8');
    const data = readLock(tmp);
    assert.ok(data['valid-agent'], 'valid full entry should be kept');
    assert.ok(data['valid-minimal'], 'valid minimal entry (sha256 only) should be kept');
    assert.ok(!data['missing-sha'], 'entry without sha256 should be filtered out');
    assert.ok(!data['null-entry'], 'null entry should be filtered out');
    assert.ok(!data['string-entry'], 'string entry should be filtered out');
    assert.ok(!data['number-entry'], 'number entry should be filtered out');
    assert.equal(Object.keys(data).length, 2, 'only 2 valid entries should remain');
  });
});

// ─── writeLock ───────────────────────────────────────────────────────────────

// ─── isValidLockEntry (M-6) ──────────────────────────────────────────────────

describe('isValidLockEntry', () => {
  it('should return true for entry with sha256 string', () => {
    assert.equal(isValidLockEntry({ sha256: 'abc' }), true);
  });

  it('should return true for full entry with all fields', () => {
    assert.equal(isValidLockEntry({ sha256: 'abc', installedAt: '2025-01-01', updatedAt: '2025-01-01' }), true);
  });

  it('should return false for empty object (missing sha256)', () => {
    assert.equal(isValidLockEntry({}), false);
  });

  it('should return false for null', () => {
    assert.equal(isValidLockEntry(null), false);
  });

  it('should return false for a string', () => {
    assert.equal(isValidLockEntry('string'), false);
  });

  it('should return false for a number', () => {
    assert.equal(isValidLockEntry(42), false);
  });

  it('should return false for undefined', () => {
    assert.equal(isValidLockEntry(undefined), false);
  });

  it('should return false when sha256 is not a string', () => {
    assert.equal(isValidLockEntry({ sha256: 123 }), false);
    assert.equal(isValidLockEntry({ sha256: null }), false);
    assert.equal(isValidLockEntry({ sha256: true }), false);
  });
});

// ─── writeLock ───────────────────────────────────────────────────────────────

describe('writeLock', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-write-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should create directories if needed', () => {
    const lockPath = getLockPath(tmp);
    assert.ok(!existsSync(lockPath));
    writeLock({}, tmp);
    assert.ok(existsSync(lockPath));
  });

  it('should write valid JSON with trailing newline', () => {
    const data = { agent: { sha256: 'abc', installedAt: 'now', updatedAt: 'now' } };
    writeLock(data, tmp);
    const raw = readFileSync(getLockPath(tmp), 'utf-8');
    assert.ok(raw.endsWith('\n'), 'File should end with trailing newline');
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed, data);
  });

  it('should write pretty-printed JSON with 2-space indent', () => {
    const data = { a: { sha256: 'x', installedAt: 'y', updatedAt: 'z' } };
    writeLock(data, tmp);
    const raw = readFileSync(getLockPath(tmp), 'utf-8');
    const expected = JSON.stringify(data, null, 2) + '\n';
    assert.equal(raw, expected);
  });

  it('should overwrite existing file', () => {
    writeLock({ first: { sha256: 'a', installedAt: 'x', updatedAt: 'x' } }, tmp);
    writeLock({ second: { sha256: 'b', installedAt: 'y', updatedAt: 'y' } }, tmp);
    const data = readLock(tmp);
    assert.ok(!data.first, 'First entry should be gone');
    assert.ok(data.second, 'Second entry should exist');
    assert.equal(data.second.sha256, 'b');
  });

  // ─── C-1: Atomic lock file writes ──────────────────────────────────────

  it('C-1: lock file should exist and contain valid JSON after writeLock()', () => {
    const data = { 'test-agent': { sha256: 'abc123', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' } };
    writeLock(data, tmp);
    const lockPath = getLockPath(tmp);
    assert.ok(existsSync(lockPath), 'lock file should exist after writeLock()');
    const raw = readFileSync(lockPath, 'utf-8');
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed, data, 'lock file should contain valid JSON matching input');
  });

  it('C-1: no .lock-tmp-* temp file should remain after successful writeLock()', () => {
    writeLock({ agent: { sha256: 'x', installedAt: 'y', updatedAt: 'z' } }, tmp);
    const lockDir = join(tmp, '.opencode', 'agents');
    const files = readdirSync(lockDir);
    const tempFiles = files.filter(f => f.startsWith('.lock-tmp-'));
    assert.equal(tempFiles.length, 0, `temp files should be cleaned up, found: ${tempFiles.join(', ')}`);
  });

  it('C-1: lock data should round-trip correctly (write then read)', () => {
    const original = {
      'agent-a': { sha256: 'hash-a', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-06-01T00:00:00Z' },
      'agent-b': { sha256: 'hash-b', installedAt: '2025-02-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z' },
    };
    writeLock(original, tmp);
    const roundTripped = readLock(tmp);
    assert.deepEqual(roundTripped, original, 'readLock() should return exactly what writeLock() wrote');
  });
});

// ─── recordInstall ───────────────────────────────────────────────────────────

describe('recordInstall', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-record-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should create a new entry with sha256, installedAt, updatedAt', () => {
    recordInstall('test-agent', 'content-v1', tmp);
    const data = readLock(tmp);
    assert.ok(data['test-agent']);
    assert.equal(data['test-agent'].sha256, sha256('content-v1'));
    assert.ok(data['test-agent'].installedAt);
    assert.ok(data['test-agent'].updatedAt);
    // installedAt and updatedAt should be ISO strings
    assert.ok(!isNaN(Date.parse(data['test-agent'].installedAt)));
    assert.ok(!isNaN(Date.parse(data['test-agent'].updatedAt)));
  });

  it('should preserve installedAt on update but change updatedAt', async () => {
    recordInstall('test-agent', 'content-v1', tmp);
    const first = readLock(tmp);
    const originalInstalledAt = first['test-agent'].installedAt;

    // Small delay to ensure different timestamps
    await new Promise(r => setTimeout(r, 20));

    recordInstall('test-agent', 'content-v2', tmp);
    const second = readLock(tmp);

    assert.equal(second['test-agent'].installedAt, originalInstalledAt, 'installedAt should be preserved');
    assert.equal(second['test-agent'].sha256, sha256('content-v2'), 'sha256 should reflect new content');
    // updatedAt should be >= installedAt
    assert.ok(
      new Date(second['test-agent'].updatedAt) >= new Date(originalInstalledAt),
      'updatedAt should be >= installedAt'
    );
  });

  it('should create lock file if it does not exist', () => {
    const lockPath = getLockPath(tmp);
    assert.ok(!existsSync(lockPath));
    recordInstall('new-agent', 'hello', tmp);
    assert.ok(existsSync(lockPath));
    const data = readLock(tmp);
    assert.ok(data['new-agent']);
  });

  it('should preserve other entries when recording', () => {
    recordInstall('agent-a', 'content-a', tmp);
    recordInstall('agent-b', 'content-b', tmp);
    const data = readLock(tmp);
    assert.ok(data['agent-a']);
    assert.ok(data['agent-b']);
    assert.equal(data['agent-a'].sha256, sha256('content-a'));
    assert.equal(data['agent-b'].sha256, sha256('content-b'));
  });
});

// ─── removeLockEntry ─────────────────────────────────────────────────────────

describe('removeLockEntry', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-remove-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should remove an entry from the lock file', () => {
    recordInstall('agent-to-remove', 'content', tmp);
    assert.ok(readLock(tmp)['agent-to-remove']);
    removeLockEntry('agent-to-remove', tmp);
    assert.ok(!readLock(tmp)['agent-to-remove']);
  });

  it('should be a no-op if entry does not exist', () => {
    recordInstall('existing', 'content', tmp);
    removeLockEntry('nonexistent', tmp);
    const data = readLock(tmp);
    assert.ok(data['existing'], 'Existing entry should remain');
  });

  it('should keep other entries intact', () => {
    recordInstall('keep-me', 'content-keep', tmp);
    recordInstall('remove-me', 'content-remove', tmp);
    removeLockEntry('remove-me', tmp);
    const data = readLock(tmp);
    assert.ok(data['keep-me']);
    assert.equal(data['keep-me'].sha256, sha256('content-keep'));
    assert.ok(!data['remove-me']);
  });
});

// ─── detectAgentStates ───────────────────────────────────────────────────────

describe('detectAgentStates', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-detect-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return "new" for agents not on disk', () => {
    const manifest = makeManifest([{ name: 'ghost-agent' }]);
    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('ghost-agent'), 'new');
  });

  it('should return "unknown" for agents on disk but not in lock', () => {
    const agent = { name: 'manual-agent', category: 'general', mode: 'subagent' };
    const manifest = makeManifest([agent]);
    writeAgentFile(tmp, agent, '# Manually copied');
    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('manual-agent'), 'unknown');
  });

  it('should return "installed" for agents with matching hash', () => {
    const content = '# Agent v1';
    const agent = { name: 'matched-agent', category: 'general', mode: 'subagent' };
    const manifest = makeManifest([agent]);
    writeAgentFile(tmp, agent, content);
    recordInstall('matched-agent', content, tmp);
    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('matched-agent'), 'installed');
  });

  it('should return "outdated" for agents with mismatched hash', () => {
    const agent = { name: 'stale-agent', category: 'general', mode: 'subagent' };
    const manifest = makeManifest([agent]);
    writeAgentFile(tmp, agent, '# Version 2 (modified on disk)');
    recordInstall('stale-agent', '# Version 1 (original)', tmp);
    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('stale-agent'), 'outdated');
  });

  it('should handle mixed states in one manifest', () => {
    const agents = [
      { name: 'new-one', category: 'cat-a', mode: 'subagent' },
      { name: 'unknown-one', category: 'cat-b', mode: 'subagent' },
      { name: 'installed-one', category: 'cat-c', mode: 'subagent' },
      { name: 'outdated-one', category: 'cat-d', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    // new-one: don't create file → 'new'
    // unknown-one: file exists, no lock entry → 'unknown'
    writeAgentFile(tmp, agents[1], '# Unknown');
    // installed-one: file matches lock → 'installed'
    const installedContent = '# Installed';
    writeAgentFile(tmp, agents[2], installedContent);
    recordInstall('installed-one', installedContent, tmp);
    // outdated-one: file differs from lock → 'outdated'
    writeAgentFile(tmp, agents[3], '# Outdated v2');
    recordInstall('outdated-one', '# Outdated v1', tmp);

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('new-one'), 'new');
    assert.equal(states.get('unknown-one'), 'unknown');
    assert.equal(states.get('installed-one'), 'installed');
    assert.equal(states.get('outdated-one'), 'outdated');
    assert.equal(states.size, 4);
  });

  it('should handle primary agents at root agents dir', () => {
    const agent = { name: 'primary-agent', category: 'general', mode: 'primary' };
    const manifest = makeManifest([agent]);
    writeAgentFile(tmp, agent, '# Primary');
    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('primary-agent'), 'unknown');
    // Verify file is at the correct path (root, not in category subdir)
    const expectedPath = join(tmp, '.opencode', 'agents', 'primary-agent.md');
    assert.ok(existsSync(expectedPath));
  });

  it('should return empty map for empty manifest', () => {
    const manifest = makeManifest([]);
    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.size, 0);
  });
});

// ─── detectInstalledSet ──────────────────────────────────────────────────────

describe('detectInstalledSet', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-installed-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return Set containing installed, outdated, and unknown agents (not "new")', () => {
    const agents = [
      { name: 'new-agent', category: 'a', mode: 'subagent' },
      { name: 'unknown-agent', category: 'b', mode: 'subagent' },
      { name: 'installed-agent', category: 'c', mode: 'subagent' },
      { name: 'outdated-agent', category: 'd', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    // new-agent: no file → 'new' → NOT in set
    // unknown-agent: file, no lock → 'unknown' → in set
    writeAgentFile(tmp, agents[1], '# Unknown');
    // installed-agent: file matches lock → 'installed' → in set
    const content = '# Installed';
    writeAgentFile(tmp, agents[2], content);
    recordInstall('installed-agent', content, tmp);
    // outdated-agent: file differs from lock → 'outdated' → in set
    writeAgentFile(tmp, agents[3], '# v2');
    recordInstall('outdated-agent', '# v1', tmp);

    const set = detectInstalledSet(manifest, tmp);
    assert.ok(!set.has('new-agent'));
    assert.ok(set.has('unknown-agent'));
    assert.ok(set.has('installed-agent'));
    assert.ok(set.has('outdated-agent'));
    assert.equal(set.size, 3);
  });

  it('should return empty set when no agents are installed', () => {
    const manifest = makeManifest([
      { name: 'a', category: 'x', mode: 'subagent' },
      { name: 'b', category: 'y', mode: 'subagent' },
    ]);
    const set = detectInstalledSet(manifest, tmp);
    assert.equal(set.size, 0);
  });

  it('should return empty set for empty manifest', () => {
    const manifest = makeManifest([]);
    const set = detectInstalledSet(manifest, tmp);
    assert.equal(set.size, 0);
  });
});

// ─── bootstrapLock ───────────────────────────────────────────────────────────

describe('bootstrapLock', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-bootstrap-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return true and create entries for installed agents without lock', () => {
    const content = '# Bootstrap me';
    const agent = { name: 'bootstrap-agent', category: 'general', mode: 'subagent' };
    const manifest = makeManifest([agent]);
    writeAgentFile(tmp, agent, content);

    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, true);

    const data = readLock(tmp);
    assert.ok(data['bootstrap-agent']);
    assert.equal(data['bootstrap-agent'].sha256, sha256(content));
    assert.ok(data['bootstrap-agent'].installedAt);
    assert.ok(data['bootstrap-agent'].updatedAt);
  });

  it('should return false when nothing to bootstrap', () => {
    // No agents on disk, nothing to do
    const manifest = makeManifest([{ name: 'missing-agent' }]);
    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, false);
  });

  it('should skip agents already in lock', () => {
    const agent = { name: 'already-locked', category: 'general', mode: 'subagent' };
    const manifest = makeManifest([agent]);
    const content = '# Already locked';
    writeAgentFile(tmp, agent, content);
    recordInstall('already-locked', content, tmp);

    const originalLock = readLock(tmp);
    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, false);
    const afterLock = readLock(tmp);
    assert.deepEqual(afterLock, originalLock, 'Lock should not change');
  });

  it('should skip agents not on disk', () => {
    const manifest = makeManifest([
      { name: 'no-file-agent', category: 'general', mode: 'subagent' },
    ]);
    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, false);
    const data = readLock(tmp);
    assert.ok(!data['no-file-agent']);
  });

  it('should bootstrap only agents without lock entries (mixed)', () => {
    const agents = [
      { name: 'needs-bootstrap', category: 'a', mode: 'subagent' },
      { name: 'already-locked', category: 'b', mode: 'subagent' },
      { name: 'not-on-disk', category: 'c', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    // needs-bootstrap: file exists, no lock
    writeAgentFile(tmp, agents[0], '# Bootstrap');
    // already-locked: file exists + lock entry
    writeAgentFile(tmp, agents[1], '# Locked');
    recordInstall('already-locked', '# Locked', tmp);
    // not-on-disk: no file

    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, true);

    const data = readLock(tmp);
    assert.ok(data['needs-bootstrap'], 'Should have bootstrapped');
    assert.equal(data['needs-bootstrap'].sha256, sha256('# Bootstrap'));
    assert.ok(data['already-locked'], 'Should still have existing entry');
    assert.ok(!data['not-on-disk'], 'Should not create entry for missing file');
  });

  it('should handle primary agent paths', () => {
    const agent = { name: 'primary-boot', category: 'general', mode: 'primary' };
    const manifest = makeManifest([agent]);
    const content = '# Primary bootstrap';
    writeAgentFile(tmp, agent, content);

    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, true);
    const data = readLock(tmp);
    assert.equal(data['primary-boot'].sha256, sha256(content));
  });

  it('should return false for empty manifest', () => {
    const manifest = makeManifest([]);
    const result = bootstrapLock(manifest, tmp);
    assert.equal(result, false);
  });
});

// ─── findOutdatedAgents ──────────────────────────────────────────────────────

describe('findOutdatedAgents', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-outdated-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should return agents whose installed hash differs from lock hash', () => {
    const agents = [
      { name: 'stale-agent', category: 'general', mode: 'subagent' },
      { name: 'fresh-agent', category: 'general', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    // stale-agent: file differs from lock → outdated
    writeAgentFile(tmp, agents[0], '# Modified version');
    recordInstall('stale-agent', '# Original version', tmp);

    // fresh-agent: file matches lock → installed
    const freshContent = '# Fresh';
    writeAgentFile(tmp, agents[1], freshContent);
    recordInstall('fresh-agent', freshContent, tmp);

    const outdated = findOutdatedAgents(manifest, tmp);
    assert.equal(outdated.length, 1);
    assert.equal(outdated[0].name, 'stale-agent');
  });

  it('should return empty when all hashes match', () => {
    const agents = [
      { name: 'ok-agent-a', category: 'a', mode: 'subagent' },
      { name: 'ok-agent-b', category: 'b', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    const contentA = '# Agent A';
    writeAgentFile(tmp, agents[0], contentA);
    recordInstall('ok-agent-a', contentA, tmp);

    const contentB = '# Agent B';
    writeAgentFile(tmp, agents[1], contentB);
    recordInstall('ok-agent-b', contentB, tmp);

    const outdated = findOutdatedAgents(manifest, tmp);
    assert.equal(outdated.length, 0);
  });

  it('should not include new or unknown agents', () => {
    const agents = [
      { name: 'new-agent', category: 'a', mode: 'subagent' },     // no file → 'new'
      { name: 'unknown-agent', category: 'b', mode: 'subagent' }, // file, no lock → 'unknown'
    ];
    const manifest = makeManifest(agents);

    writeAgentFile(tmp, agents[1], '# Unknown');

    const outdated = findOutdatedAgents(manifest, tmp);
    assert.equal(outdated.length, 0);
  });

  it('should return full AgentEntry objects', () => {
    const agents = [
      { name: 'stale', category: 'cat', mode: 'subagent', description: 'A stale agent', tags: ['test'] },
    ];
    const manifest = makeManifest(agents);
    writeAgentFile(tmp, agents[0], '# v2');
    recordInstall('stale', '# v1', tmp);

    const outdated = findOutdatedAgents(manifest, tmp);
    assert.equal(outdated.length, 1);
    assert.equal(outdated[0].name, 'stale');
    assert.equal(outdated[0].category, 'cat');
    assert.ok(outdated[0].description);
  });

  it('should return empty for empty manifest', () => {
    const manifest = makeManifest([]);
    const outdated = findOutdatedAgents(manifest, tmp);
    assert.equal(outdated.length, 0);
  });
});

// ─── verifyLockIntegrity ─────────────────────────────────────────────────────

describe('verifyLockIntegrity', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-verify-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should detect ok, mismatch, and missing correctly', () => {
    const agents = [
      { name: 'ok-agent', category: 'a', mode: 'subagent' },
      { name: 'bad-agent', category: 'b', mode: 'subagent' },
      { name: 'gone-agent', category: 'c', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    // ok-agent: file matches lock
    const okContent = '# OK';
    writeAgentFile(tmp, agents[0], okContent);
    recordInstall('ok-agent', okContent, tmp);

    // bad-agent: file differs from lock
    writeAgentFile(tmp, agents[1], '# Modified');
    recordInstall('bad-agent', '# Original', tmp);

    // gone-agent: lock entry exists but file removed
    recordInstall('gone-agent', '# Was here', tmp);

    const result = verifyLockIntegrity(manifest, tmp);
    assert.deepEqual(result.ok, ['ok-agent']);
    assert.deepEqual(result.mismatch, ['bad-agent']);
    assert.deepEqual(result.missing, ['gone-agent']);
  });

  it('should return all empty arrays when lock is empty', () => {
    const manifest = makeManifest([{ name: 'any', category: 'x', mode: 'subagent' }]);
    const result = verifyLockIntegrity(manifest, tmp);
    assert.deepEqual(result.ok, []);
    assert.deepEqual(result.mismatch, []);
    assert.deepEqual(result.missing, []);
  });

  it('should report all ok when everything matches', () => {
    const agents = [
      { name: 'good-a', category: 'a', mode: 'subagent' },
      { name: 'good-b', category: 'b', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);

    const contentA = '# Good A';
    writeAgentFile(tmp, agents[0], contentA);
    recordInstall('good-a', contentA, tmp);

    const contentB = '# Good B';
    writeAgentFile(tmp, agents[1], contentB);
    recordInstall('good-b', contentB, tmp);

    const result = verifyLockIntegrity(manifest, tmp);
    assert.equal(result.ok.length, 2);
    assert.equal(result.mismatch.length, 0);
    assert.equal(result.missing.length, 0);
  });

  it('should handle primary agent paths', () => {
    const agent = { name: 'primary-check', category: 'general', mode: 'primary' };
    const manifest = makeManifest([agent]);
    const content = '# Primary';
    writeAgentFile(tmp, agent, content);
    recordInstall('primary-check', content, tmp);

    const result = verifyLockIntegrity(manifest, tmp);
    assert.deepEqual(result.ok, ['primary-check']);
    assert.equal(result.mismatch.length, 0);
    assert.equal(result.missing.length, 0);
  });
});

// ─── rehashLock ──────────────────────────────────────────────────────────────

describe('rehashLock', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-rehash-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should rebuild lock entries for all installed agents', () => {
    const agents = [
      { name: 'rehash-a', category: 'a', mode: 'subagent' },
      { name: 'rehash-b', category: 'b', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);
    const contentA = '# Rehash A';
    const contentB = '# Rehash B';
    writeAgentFile(tmp, agents[0], contentA);
    writeAgentFile(tmp, agents[1], contentB);

    const count = rehashLock(manifest, tmp);
    assert.equal(count, 2);

    const lock = readLock(tmp);
    assert.equal(lock['rehash-a'].sha256, sha256(contentA));
    assert.equal(lock['rehash-b'].sha256, sha256(contentB));
  });

  it('should overwrite existing lock entries', () => {
    const agent = { name: 'overwrite-me', category: 'a', mode: 'subagent' };
    const manifest = makeManifest([agent]);

    // Record with old content
    recordInstall('overwrite-me', '# Old', tmp);
    const oldLock = readLock(tmp);
    assert.equal(oldLock['overwrite-me'].sha256, sha256('# Old'));

    // Write new content to disk, then rehash
    writeAgentFile(tmp, agent, '# New');
    rehashLock(manifest, tmp);
    const newLock = readLock(tmp);
    assert.equal(newLock['overwrite-me'].sha256, sha256('# New'));
  });

  it('should skip agents not on disk', () => {
    const agents = [
      { name: 'present', category: 'a', mode: 'subagent' },
      { name: 'absent', category: 'b', mode: 'subagent' },
    ];
    const manifest = makeManifest(agents);
    writeAgentFile(tmp, agents[0], '# Present');

    const count = rehashLock(manifest, tmp);
    assert.equal(count, 1);
    const lock = readLock(tmp);
    assert.ok(lock['present']);
    assert.ok(!lock['absent']);
  });

  it('should return 0 for empty manifest', () => {
    const manifest = makeManifest([]);
    const count = rehashLock(manifest, tmp);
    assert.equal(count, 0);
  });

  it('should remove orphan lock entries not in manifest', () => {
    const manifest = makeManifest([]);
    // Pre-populate lock with an orphan entry
    recordInstall('orphan-agent', '# Orphan', tmp);
    assert.ok(readLock(tmp)['orphan-agent']);

    rehashLock(manifest, tmp);
    const lock = readLock(tmp);
    assert.ok(!lock['orphan-agent'], 'Orphan entry should be removed after rehash');
  });
});

// ─── readLock — corrupted JSON recovery (S3.4) ──────────────────────────────

describe('readLock — corrupted JSON recovery', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-recovery-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should create .bak backup of corrupted lock file', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    const corruptedContent = '<<< corrupted garbage >>>';
    writeFileSync(lockPath, corruptedContent, 'utf-8');

    captureStderr(() => { readLock(tmp); });

    const bakPath = lockPath + '.bak';
    assert.ok(existsSync(bakPath), '.bak file should exist after corrupted read');
    assert.equal(readFileSync(bakPath, 'utf-8'), corruptedContent,
      '.bak should contain the original corrupted content');
    // Original lock file should have been renamed (moved), so it no longer exists
    assert.ok(!existsSync(lockPath), 'original lock file should be gone after rename');
  });

  it('should return empty object for corrupted lock file', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, '{{{invalid json', 'utf-8');

    let data;
    captureStderr(() => { data = readLock(tmp); });
    assert.deepEqual(data, {}, 'corrupted lock should return empty object');
  });

  it('should write warning to stderr that includes .bak path', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    writeFileSync(lockPath, 'not-json!!!', 'utf-8');

    const output = captureStderr(() => { readLock(tmp); });

    const bakPath = lockPath + '.bak';
    assert.ok(output.includes('Warning'), 'stderr should contain "Warning"');
    assert.ok(output.includes(bakPath), `stderr should contain the .bak path: ${bakPath}`);
    assert.ok(output.includes('rehash'), 'stderr should mention rehash');
  });

  it('should recover from empty lock file', () => {
    const lockPath = getLockPath(tmp);
    const lockDir = join(lockPath, '..');
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(lockPath, '');  // 0 bytes

    captureStderr(() => {
      const result = readLock(tmp);
      assert.deepStrictEqual(result, {});
    });

    // Verify backup was created
    const backups = readdirSync(lockDir).filter(f => f.endsWith('.bak'));
    assert.strictEqual(backups.length, 1);
  });

  it('should handle backup rename failure gracefully', { skip: process.getuid?.() === 0 && 'root ignores chmod' }, () => {
    const lockPath = getLockPath(tmp);
    const lockDir = join(lockPath, '..');
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(lockPath, '<<< broken >>>', 'utf-8');

    // Make parent directory read-only so renameSync fails
    chmodSync(lockDir, 0o555);

    let data;
    let output;
    try {
      output = captureStderr(() => { data = readLock(tmp); });
    } finally {
      // Restore write permission so afterEach cleanup can remove the dir
      chmodSync(lockDir, 0o755);
    }

    assert.deepEqual(data, {}, 'should still return {} even when backup fails');
    assert.ok(output.includes('backup failed'),
      `stderr should mention "(backup failed)", got: ${output}`);
  });

  it('should overwrite previous .bak file', () => {
    const lockPath = getLockPath(tmp);
    mkdirSync(join(lockPath, '..'), { recursive: true });
    const bakPath = lockPath + '.bak';

    // Create an old .bak file
    writeFileSync(bakPath, 'old backup content', 'utf-8');

    // Write new corrupted lock
    const newCorrupted = '### newer corruption ###';
    writeFileSync(lockPath, newCorrupted, 'utf-8');

    captureStderr(() => { readLock(tmp); });

    assert.equal(readFileSync(bakPath, 'utf-8'), newCorrupted,
      '.bak should contain the latest corrupted content, not the old backup');
  });
});

// ─── detectAgentStates — mode: "all" handling ────────────────────────────────

describe('detectAgentStates — mode "all"', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-mode-all-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should find agent with mode "all" at primary path', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    // Place the file at the primary location (basePath root)
    const primaryPath = join(tmp, '.opencode', 'agents', 'prd.md');
    mkdirSync(join(primaryPath, '..'), { recursive: true });
    writeFileSync(primaryPath, '# PRD Agent', 'utf-8');

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('prd'), 'unknown',
      'mode "all" agent at primary path should be detected');
  });

  it('should find agent with mode "all" at subagent path when not at primary', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    // Place the file at the subagent location (category subdir)
    const subPath = join(tmp, '.opencode', 'agents', 'business', 'prd.md');
    mkdirSync(join(subPath, '..'), { recursive: true });
    writeFileSync(subPath, '# PRD Agent', 'utf-8');

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('prd'), 'unknown',
      'mode "all" agent at subagent path should be detected');
  });

  it('should prefer primary path over subagent path for mode "all"', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    // Place files at BOTH locations with different content
    const primaryPath = join(tmp, '.opencode', 'agents', 'prd.md');
    const subPath = join(tmp, '.opencode', 'agents', 'business', 'prd.md');
    mkdirSync(join(primaryPath, '..'), { recursive: true });
    mkdirSync(join(subPath, '..'), { recursive: true });
    writeFileSync(primaryPath, '# Primary version', 'utf-8');
    writeFileSync(subPath, '# Subagent version', 'utf-8');

    // Record install with the PRIMARY content
    recordInstall('prd', '# Primary version', tmp);

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('prd'), 'installed',
      'should use primary path when both exist, and hash should match primary content');
  });

  it('should return "new" for mode "all" agent not on disk at either path', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('prd'), 'new');
  });
});

// ─── detectAgentStates — filesystem scan for local agents ───────────────────

describe('detectAgentStates — filesystem scan', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-scan-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should discover local .md files not in manifest', () => {
    // Manifest has one agent
    const manifest = makeManifest([
      { name: 'known-agent', category: 'general', mode: 'subagent' },
    ]);
    writeAgentFile(tmp, manifest.agents[0], '# Known');

    // Place an extra agent file NOT in the manifest
    const localPath = join(tmp, '.opencode', 'agents', 'custom', 'local-agent.md');
    mkdirSync(join(localPath, '..'), { recursive: true });
    writeFileSync(localPath, '# Local custom agent', 'utf-8');

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.get('known-agent'), 'unknown', 'manifest agent should be detected');
    assert.equal(states.get('local-agent'), 'unknown',
      'local agent not in manifest should be discovered as "unknown"');
    assert.ok(states.size >= 2, 'should have at least 2 agents');
  });

  it('should not duplicate agents already in manifest', () => {
    const agent = { name: 'ai-engineer', category: 'ai', mode: 'subagent' };
    const manifest = makeManifest([agent]);
    writeAgentFile(tmp, agent, '# AI Engineer');

    const states = detectAgentStates(manifest, tmp);
    // Count entries — should be exactly 1, not duplicated by the scan
    let count = 0;
    for (const [name] of states) {
      if (name === 'ai-engineer') count++;
    }
    assert.equal(count, 1, 'manifest agent should not be duplicated by filesystem scan');
  });

  it('should ignore non-.md files during scan', () => {
    const manifest = makeManifest([]);

    // Create the agents directory with some non-md files
    const basePath = join(tmp, '.opencode', 'agents');
    mkdirSync(basePath, { recursive: true });
    writeFileSync(join(basePath, 'readme.txt'), 'not an agent', 'utf-8');
    writeFileSync(join(basePath, '.manifest-lock.json'), '{}', 'utf-8');
    writeFileSync(join(basePath, 'legit-agent.md'), '# Agent', 'utf-8');

    const states = detectAgentStates(manifest, tmp);
    assert.equal(states.size, 1, 'should only find .md files');
    assert.equal(states.get('legit-agent'), 'unknown');
  });
});

// ─── detectInstalledSet — includes locally-scanned agents ────────────────────

describe('detectInstalledSet — local agents', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-installed-local-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('should include locally-scanned agents in installed set', () => {
    const manifest = makeManifest([]);

    // Place a local agent file not in manifest
    const localPath = join(tmp, '.opencode', 'agents', 'local-only.md');
    mkdirSync(join(localPath, '..'), { recursive: true });
    writeFileSync(localPath, '# Local only agent', 'utf-8');

    const set = detectInstalledSet(manifest, tmp);
    assert.ok(set.has('local-only'),
      'locally-scanned agent should appear in installed set');
  });

  it('should include mode "all" agents in installed set', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    // Place at primary path
    const primaryPath = join(tmp, '.opencode', 'agents', 'prd.md');
    mkdirSync(join(primaryPath, '..'), { recursive: true });
    writeFileSync(primaryPath, '# PRD', 'utf-8');

    const set = detectInstalledSet(manifest, tmp);
    assert.ok(set.has('prd'), 'mode "all" agent should be in installed set');
  });
});

// ─── Acceptance tests: local agent detection (Bug 2 fix) ─────────────────────
// Validates that manually placed .md files in .opencode/agents/ are detected
// by the filesystem scan, even when they're absent from the manifest.
// ─────────────────────────────────────────────────────────────────────────────

describe('Acceptance: manually placed agent files are detected (Bug 2)', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-acceptance-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('a manually placed .md in .opencode/agents/ shows up as "unknown"', () => {
    // User drops a custom agent file — no manifest entry, no lock entry
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, 'my-custom-agent.md'), '# My Custom Agent\nDoes custom things.', 'utf-8');

    const manifest = makeManifest([]); // empty manifest — no agents defined
    const states = detectAgentStates(manifest, tmp);

    assert.ok(states.has('my-custom-agent'),
      'Manually placed agent should be detected by filesystem scan');
    assert.equal(states.get('my-custom-agent'), 'unknown',
      'Agent without lock entry should have state "unknown"');
  });

  it('mode "all" agent installed at root level is detected', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    // Place at primary (root) path — .opencode/agents/prd.md
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, 'prd.md'), '# PRD Agent\nProduct requirements.', 'utf-8');

    const states = detectAgentStates(manifest, tmp);

    assert.ok(states.has('prd'), 'mode "all" agent at root should be detected');
    assert.equal(states.get('prd'), 'unknown',
      'Agent without lock entry should be "unknown" (not "new")');
  });

  it('mode "all" agent installed in category subdir is detected via fallback', () => {
    const agent = { name: 'prd', category: 'business', mode: 'all' };
    const manifest = makeManifest([agent]);

    // Place at category subdir — .opencode/agents/business/prd.md (fallback path)
    const catDir = join(tmp, '.opencode', 'agents', 'business');
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, 'prd.md'), '# PRD Agent\nProduct requirements.', 'utf-8');

    const states = detectAgentStates(manifest, tmp);

    assert.ok(states.has('prd'), 'mode "all" agent in category subdir should be detected');
    assert.equal(states.get('prd'), 'unknown',
      'Agent found via fallback path without lock entry should be "unknown"');
  });

  it('detectInstalledSet includes manually placed local agents', () => {
    const manifest = makeManifest([]); // no manifest agents

    // Drop a local-only agent file
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });
    writeFileSync(join(agentDir, 'rogue-helper.md'), '# Rogue Helper\nUser-created agent.', 'utf-8');

    const set = detectInstalledSet(manifest, tmp);

    assert.ok(set.has('rogue-helper'),
      'detectInstalledSet should include local-only agents found by filesystem scan');
  });

  it('local agents coexist with manifest agents without duplication', () => {
    const manifestAgent = { name: 'ai-engineer', category: 'ai', mode: 'subagent' };
    const manifest = makeManifest([manifestAgent]);

    // Install the manifest agent on disk
    const catDir = join(tmp, '.opencode', 'agents', 'ai');
    mkdirSync(catDir, { recursive: true });
    writeFileSync(join(catDir, 'ai-engineer.md'), '# AI Engineer', 'utf-8');

    // Also drop a local agent not in the manifest
    const agentDir = join(tmp, '.opencode', 'agents');
    writeFileSync(join(agentDir, 'my-local-tool.md'), '# My Local Tool', 'utf-8');

    const states = detectAgentStates(manifest, tmp);

    // Manifest agent exists on disk without lock entry → unknown
    assert.equal(states.get('ai-engineer'), 'unknown',
      'Manifest agent without lock entry should be "unknown"');

    // Local agent not in manifest → also unknown
    assert.ok(states.has('my-local-tool'),
      'Local agent should be detected alongside manifest agents');
    assert.equal(states.get('my-local-tool'), 'unknown',
      'Local agent without lock entry should be "unknown"');

    // No duplication: total entries = 2 (one manifest + one local)
    assert.equal(states.size, 2,
      `Expected exactly 2 entries (manifest + local), got ${states.size}`);
  });
});

// ─── SEC: symlink files in agents dir are skipped (Issue 1) ──────────────────

describe('Security: symlinks in agents dir are skipped by scanLocalAgents', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-symlink-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('symlinked .md file is NOT detected by detectAgentStates', () => {
    const manifest = makeManifest([]);
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });

    // Create a real file outside the agents dir
    const outsideFile = join(tmp, 'secret.md');
    writeFileSync(outsideFile, '# Secret content', 'utf-8');

    // Symlink from agents dir to the outside file
    symlinkSync(outsideFile, join(agentDir, 'evil-agent.md'));

    // Also place a legit (non-symlink) agent for sanity check
    writeFileSync(join(agentDir, 'legit-agent.md'), '# Legit', 'utf-8');

    const states = detectAgentStates(manifest, tmp);

    assert.ok(!states.has('evil-agent'),
      'Symlinked agent file should NOT appear in detected states');
    assert.ok(states.has('legit-agent'),
      'Non-symlink agent should still be detected');
  });

  it('symlinked .md in a subdirectory is also skipped', () => {
    const manifest = makeManifest([]);
    const subDir = join(tmp, '.opencode', 'agents', 'custom');
    mkdirSync(subDir, { recursive: true });

    const outsideFile = join(tmp, 'private-key.md');
    writeFileSync(outsideFile, '# Private Key', 'utf-8');

    symlinkSync(outsideFile, join(subDir, 'sneaky.md'));

    const states = detectAgentStates(manifest, tmp);

    assert.ok(!states.has('sneaky'),
      'Symlink in subdirectory should be silently skipped');
  });

  it('rehashLock skips symlinked agent files', () => {
    const manifest = makeManifest([]);
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });

    const outsideFile = join(tmp, 'outside.md');
    writeFileSync(outsideFile, '# Outside', 'utf-8');
    symlinkSync(outsideFile, join(agentDir, 'symlinked.md'));
    writeFileSync(join(agentDir, 'real-agent.md'), '# Real', 'utf-8');

    const count = rehashLock(manifest, tmp);

    assert.equal(count, 1, 'Only the real (non-symlink) agent should be hashed');
    const lock = readLock(tmp);
    assert.ok(lock['real-agent'], 'Real agent should be in lock');
    assert.ok(!lock['symlinked'], 'Symlinked agent should NOT be in lock');
  });
});

// ─── SEC: path traversal keys filtered from lock file (Issue 2) ──────────────

describe('Security: readLock filters path traversal keys', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-traversal-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('keys with path traversal patterns are filtered out', () => {
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });

    // Write a lock file with malicious keys
    const lockPath = join(agentDir, '.manifest-lock.json');
    const maliciousLock = {
      'legit-agent': { sha256: 'abc123', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      '../../../../etc/passwd': { sha256: 'evil1', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      '../../../secrets': { sha256: 'evil2', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      'foo/bar': { sha256: 'evil3', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
      '.hidden': { sha256: 'evil4', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    };
    writeFileSync(lockPath, JSON.stringify(maliciousLock, null, 2), 'utf-8');

    const lock = readLock(tmp);

    assert.ok(lock['legit-agent'], 'Valid agent name should be kept');
    assert.ok(!lock['../../../../etc/passwd'], 'Path traversal key should be filtered');
    assert.ok(!lock['../../../secrets'], 'Relative path key should be filtered');
    assert.ok(!lock['foo/bar'], 'Slash-containing key should be filtered');
    assert.ok(!lock['.hidden'], 'Dot-prefixed key should be filtered');
    assert.equal(Object.keys(lock).length, 1, 'Only the valid entry should remain');
  });

  it('verifyLockIntegrity never sees traversal keys', () => {
    const manifest = makeManifest([]);
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });

    // Poisoned lock file
    const lockPath = join(agentDir, '.manifest-lock.json');
    writeFileSync(lockPath, JSON.stringify({
      '../../etc/shadow': { sha256: 'bad', installedAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z' },
    }), 'utf-8');

    const result = verifyLockIntegrity(manifest, tmp);

    // The traversal key should be filtered by readLock, so nothing to verify
    assert.equal(result.ok.length, 0);
    assert.equal(result.mismatch.length, 0);
    assert.equal(result.missing.length, 0);
  });

  it('relativePath with path traversal is rejected by isValidLockEntry', () => {
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });

    // Lock file with valid key but malicious relativePath
    const lockPath = join(agentDir, '.manifest-lock.json');
    writeFileSync(lockPath, JSON.stringify({
      'legit-agent': {
        sha256: 'abc123',
        installedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        relativePath: '../../../../etc/shadow',
      },
    }), 'utf-8');

    const lock = readLock(tmp);
    assert.ok(!lock['legit-agent'],
      'Entry with traversal relativePath should be filtered out by isValidLockEntry');
  });
});

// ─── verifyLockIntegrity finds agents in subdirectories via relativePath (Issue 3) ──

describe('verifyLockIntegrity uses relativePath for subdirectory agents', () => {
  /** @type {string} */
  let tmp;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'lock-relpath-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('rehash stores relativePath and verify finds agent in subdirectory', () => {
    const manifest = makeManifest([]);
    const subDir = join(tmp, '.opencode', 'agents', 'custom');
    mkdirSync(subDir, { recursive: true });

    const content = '# My Custom Agent';
    writeFileSync(join(subDir, 'my-agent.md'), content, 'utf-8');

    // Rehash should discover the agent and store relativePath
    rehashLock(manifest, tmp);
    const lock = readLock(tmp);

    assert.ok(lock['my-agent'], 'Agent should be in lock after rehash');
    assert.equal(lock['my-agent'].relativePath, join('custom', 'my-agent.md'),
      'relativePath should be stored relative to basePath');

    // Now verify — it should find the file via relativePath, not root-level fallback
    const result = verifyLockIntegrity(manifest, tmp);
    assert.deepEqual(result.ok, ['my-agent'],
      'Agent in subdirectory should be found via relativePath');
    assert.deepEqual(result.missing, [],
      'No agents should be missing');
  });

  it('bootstrapLock stores relativePath for discovered local agents', () => {
    const manifest = makeManifest([]);
    const subDir = join(tmp, '.opencode', 'agents', 'tools');
    mkdirSync(subDir, { recursive: true });

    writeFileSync(join(subDir, 'helper.md'), '# Helper', 'utf-8');

    bootstrapLock(manifest, tmp);
    const lock = readLock(tmp);

    assert.ok(lock['helper'], 'Agent should be in lock after bootstrap');
    assert.equal(lock['helper'].relativePath, join('tools', 'helper.md'),
      'relativePath should be stored for bootstrapped local agents');
  });

  it('verify falls back to {name}.md for entries without relativePath', () => {
    const manifest = makeManifest([]);
    const agentDir = join(tmp, '.opencode', 'agents');
    mkdirSync(agentDir, { recursive: true });

    const content = '# Root Agent';
    writeFileSync(join(agentDir, 'root-agent.md'), content, 'utf-8');

    // Manually write a lock entry WITHOUT relativePath (backward compat)
    const lockPath = join(agentDir, '.manifest-lock.json');
    writeFileSync(lockPath, JSON.stringify({
      'root-agent': {
        sha256: sha256(content),
        installedAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        // no relativePath — old lock format
      },
    }), 'utf-8');

    const result = verifyLockIntegrity(manifest, tmp);
    assert.deepEqual(result.ok, ['root-agent'],
      'Agent without relativePath should be found via {name}.md fallback');
  });
});
