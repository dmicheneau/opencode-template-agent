import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
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
