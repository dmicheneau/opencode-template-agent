/**
 * @module lock
 * Hash-based lock file for agent update detection.
 * Tracks installed agent content SHA-256 for change detection (NOT security).
 * Zero npm deps — Node 20+ built-ins only.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCK_FILENAME = '.manifest-lock.json';

// ─── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {{ sha256: string, installedAt: string, updatedAt: string }} LockEntry
 * @typedef {Record<string, LockEntry>} LockData
 * @typedef {'installed'|'outdated'|'new'|'unknown'} AgentState
 */

// ─── Hash ────────────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hex digest of a string or Buffer.
 * @param {string|Buffer} content
 * @returns {string}
 */
export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

// ─── Lock file I/O ───────────────────────────────────────────────────────────

/**
 * Get the lock file path for the given cwd.
 * @param {string} [cwd]
 * @returns {string}
 */
export function getLockPath(cwd = process.cwd()) {
  return join(cwd, '.opencode', 'agents', LOCK_FILENAME);
}

/**
 * Read the lock file. Returns empty object if not found or invalid.
 * @param {string} [cwd]
 * @returns {LockData}
 */
export function readLock(cwd = process.cwd()) {
  const p = getLockPath(cwd);
  if (!existsSync(p)) return {};
  try {
    const raw = readFileSync(p, 'utf-8');
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    return data;
  } catch {
    return {};
  }
}

/**
 * Write the lock file. Creates parent directories if needed.
 * @param {LockData} data
 * @param {string} [cwd]
 */
export function writeLock(data, cwd = process.cwd()) {
  const p = getLockPath(cwd);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

// ─── Lock entry management ───────────────────────────────────────────────────

/**
 * Record an agent installation in the lock file.
 * @param {string} agentName
 * @param {string|Buffer} content
 * @param {string} [cwd]
 */
export function recordInstall(agentName, content, cwd = process.cwd()) {
  const lock = readLock(cwd);
  const now = new Date().toISOString();
  const existing = lock[agentName];
  lock[agentName] = {
    sha256: sha256(content),
    installedAt: existing?.installedAt || now,
    updatedAt: now,
  };
  writeLock(lock, cwd);
}

/**
 * Remove an agent entry from the lock file.
 * @param {string} agentName
 * @param {string} [cwd]
 */
export function removeLockEntry(agentName, cwd = process.cwd()) {
  const lock = readLock(cwd);
  delete lock[agentName];
  writeLock(lock, cwd);
}

// ─── State detection ─────────────────────────────────────────────────────────

/**
 * Detect the state of each agent in the manifest.
 * Returns Map<name, AgentState> where:
 * - 'installed': file exists AND hash matches lock entry
 * - 'outdated':  file exists AND hash does NOT match lock entry (content changed)
 * - 'new':       file does NOT exist
 * - 'unknown':   file exists but NO lock entry (pre-lock install or manual copy)
 *
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [cwd]
 * @returns {Map<string, AgentState>}
 */
export function detectAgentStates(manifest, cwd = process.cwd()) {
  const lock = readLock(cwd);
  const states = new Map();
  const basePath = manifest.base_path || '.opencode/agents';

  for (const agent of manifest.agents) {
    const filePath = agent.mode === 'primary'
      ? join(cwd, basePath, `${agent.name}.md`)
      : join(cwd, basePath, agent.category, `${agent.name}.md`);

    if (!existsSync(filePath)) {
      states.set(agent.name, 'new');
      continue;
    }

    const entry = lock[agent.name];
    if (!entry) {
      states.set(agent.name, 'unknown');
      continue;
    }

    // Compare current file hash with lock hash
    const currentContent = readFileSync(filePath, 'utf-8');
    const currentHash = sha256(currentContent);
    states.set(agent.name, currentHash === entry.sha256 ? 'installed' : 'outdated');
  }

  return states;
}

/**
 * Backward-compatible wrapper: returns Set<name> of agents that exist on disk
 * (installed + outdated + unknown). Drop-in replacement for the old detectInstalled().
 *
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [cwd]
 * @returns {Set<string>}
 */
export function detectInstalledSet(manifest, cwd = process.cwd()) {
  const states = detectAgentStates(manifest, cwd);
  const set = new Set();
  for (const [name, state] of states) {
    if (state !== 'new') set.add(name);
  }
  return set;
}

// ─── Outdated detection ──────────────────────────────────────────────────────

/**
 * Find agents whose installed file hash does NOT match the lock hash.
 * Returns the full AgentEntry objects for outdated agents only.
 *
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [cwd]
 * @returns {import('./registry.mjs').AgentEntry[]}
 */
export function findOutdatedAgents(manifest, cwd = process.cwd()) {
  const states = detectAgentStates(manifest, cwd);
  return manifest.agents.filter((a) => states.get(a.name) === 'outdated');
}

// ─── Integrity verification ──────────────────────────────────────────────────

/**
 * Verify installed files match their lock file hashes.
 * Checks every entry in the lock file against the actual file on disk.
 *
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [cwd]
 * @returns {{ ok: string[], mismatch: string[], missing: string[] }}
 */
export function verifyLockIntegrity(manifest, cwd = process.cwd()) {
  const lock = readLock(cwd);
  const basePath = manifest.base_path || '.opencode/agents';
  const agentMap = new Map(manifest.agents.map((a) => [a.name, a]));

  /** @type {string[]} */ const ok = [];
  /** @type {string[]} */ const mismatch = [];
  /** @type {string[]} */ const missing = [];

  for (const [name, entry] of Object.entries(lock)) {
    const agent = agentMap.get(name);
    const filePath = agent
      ? (agent.mode === 'primary'
          ? join(cwd, basePath, `${name}.md`)
          : join(cwd, basePath, agent.category, `${name}.md`))
      : join(cwd, basePath, `${name}.md`); // fallback for orphan lock entries

    if (!existsSync(filePath)) {
      missing.push(name);
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');
    const currentHash = sha256(content);
    if (currentHash === entry.sha256) {
      ok.push(name);
    } else {
      mismatch.push(name);
    }
  }

  return { ok, mismatch, missing };
}

// ─── Rehash ──────────────────────────────────────────────────────────────────

/**
 * Rebuild the lock file from disk — scan all installed agents and recompute
 * their SHA-256 hashes. Unlike bootstrapLock, this overwrites existing entries.
 *
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [cwd]
 * @returns {number}  number of entries written
 */
export function rehashLock(manifest, cwd = process.cwd()) {
  const basePath = manifest.base_path || '.opencode/agents';
  /** @type {LockData} */
  const lock = {};
  const now = new Date().toISOString();

  for (const agent of manifest.agents) {
    const filePath = agent.mode === 'primary'
      ? join(cwd, basePath, `${agent.name}.md`)
      : join(cwd, basePath, agent.category, `${agent.name}.md`);

    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    lock[agent.name] = {
      sha256: sha256(content),
      installedAt: now,
      updatedAt: now,
    };
  }

  writeLock(lock, cwd);
  return Object.keys(lock).length;
}

// ─── Migration ───────────────────────────────────────────────────────────────

/**
 * Bootstrap lock file for existing installations.
 * For each installed agent without a lock entry, compute hash and add entry.
 *
 * @param {import('./registry.mjs').Manifest} manifest
 * @param {string} [cwd]
 * @returns {boolean}  true if lock file was updated
 */
export function bootstrapLock(manifest, cwd = process.cwd()) {
  const lock = readLock(cwd);
  const basePath = manifest.base_path || '.opencode/agents';
  let changed = false;

  for (const agent of manifest.agents) {
    if (lock[agent.name]) continue;

    const filePath = agent.mode === 'primary'
      ? join(cwd, basePath, `${agent.name}.md`)
      : join(cwd, basePath, agent.category, `${agent.name}.md`);

    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    const now = new Date().toISOString();
    lock[agent.name] = {
      sha256: sha256(content),
      installedAt: now,
      updatedAt: now,
    };
    changed = true;
  }

  if (changed) writeLock(lock, cwd);
  return changed;
}
