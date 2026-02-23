/**
 * @module lock
 * Hash-based lock file for agent update detection.
 * Tracks installed agent content SHA-256 for change detection (NOT security).
 * Zero npm deps — Node 20+ built-ins only.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { SAFE_NAME_RE } from './registry.mjs';

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCK_FILENAME = '.manifest-lock.json';

// ─── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {{ sha256: string, installedAt: string, updatedAt: string, relativePath?: string }} LockEntry
 * @typedef {Record<string, LockEntry>} LockData
 * @typedef {'installed'|'outdated'|'new'|'unknown'} AgentState
 */

// ─── Hash ────────────────────────────────────────────────────────────────────

/**
 * SHA-256 hashes in the lock file are for CHANGE DETECTION only.
 * They detect when an agent file has been modified since installation.
 * They are NOT for supply-chain verification — the download source
 * is trusted via HTTPS + host allowlist, not content hashing.
 *
 * When permissions are modified at install time, the hash is computed
 * AFTER permission modification, so rehash will not flag them as changed.
 */

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
 * @param {string} [basePath]  manifest base_path override (e.g. 'custom/agents')
 * @returns {string}
 */
export function getLockPath(cwd = process.cwd(), basePath) {
  return join(cwd, basePath || '.opencode/agents', LOCK_FILENAME);
}

/**
 * Check whether a lock entry has the minimum required shape.
 * @param {unknown} entry
 * @returns {entry is LockEntry}
 */
export function isValidLockEntry(entry) {
  if (typeof entry !== 'object' || entry === null) return false;
  if (typeof /** @type {any} */ (entry).sha256 !== 'string') return false;
  // SEC: validate relativePath — reject path traversal attempts
  const rp = /** @type {any} */ (entry).relativePath;
  if (rp !== undefined) {
    if (typeof rp !== 'string' || rp.includes('..') || rp.startsWith('/') || rp.startsWith('\\')) return false;
  }
  return true;
}

/**
 * Read the lock file. Returns empty object if not found or invalid.
 * Emits a stderr warning when the file exists but is corrupted.
 * Invalid entries (missing `sha256`, etc.) are silently filtered out.
 * @param {string} [cwd]
 * @param {string} [basePath]  manifest base_path override
 * @returns {LockData}
 */
export function readLock(cwd = process.cwd(), basePath) {
  const p = getLockPath(cwd, basePath);
  if (!existsSync(p)) return {};
  try {
    const raw = readFileSync(p, 'utf-8');
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};

    // M-6: filter out entries that don't have the required shape
    // SEC: filter out keys that could cause path traversal
    /** @type {LockData} */
    const clean = {};
    for (const [name, entry] of Object.entries(data)) {
      if (!SAFE_NAME_RE.test(name)) continue;
      if (isValidLockEntry(entry)) {
        clean[name] = entry;
      }
    }
    return clean;
  } catch (err) {
    // Only recover from JSON parse errors — re-throw filesystem errors (EACCES, etc.)
    if (!(err instanceof SyntaxError)) throw err;

    // Back up corrupted file for debugging, then start fresh
    const bakPath = p + '.bak';
    let backedUp = false;
    try {
      renameSync(p, bakPath);
      backedUp = true;
    } catch { /* backup failed — proceed anyway */ }
    const suffix = backedUp ? `, backed up to ${bakPath}` : ' (backup failed)';
    process.stderr.write(
      `Warning: Lock file corrupted${suffix}. Run 'rehash' to rebuild.\n`,
    );
    return {};
  }
}

/**
 * Write the lock file atomically (write-to-temp + rename).
 * Creates parent directories if needed.
 * @param {LockData} data
 * @param {string} [cwd]
 * @param {string} [basePath]  manifest base_path override
 */
export function writeLock(data, cwd = process.cwd(), basePath) {
  const p = getLockPath(cwd, basePath);
  const dir = dirname(p);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.lock-tmp-${process.pid}`);
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  renameSync(tmp, p); // atomic on POSIX when same filesystem
}

// ─── Lock entry management ───────────────────────────────────────────────────

/**
 * Record an agent installation in the lock file.
 * @param {string} agentName
 * @param {string|Buffer} content
 * @param {string} [cwd]
 * @param {string} [basePath]  manifest base_path override
 */
export function recordInstall(agentName, content, cwd = process.cwd(), basePath) {
  const lock = readLock(cwd, basePath);
  const now = new Date().toISOString();
  const existing = lock[agentName];
  lock[agentName] = {
    sha256: sha256(content),
    installedAt: existing?.installedAt || now,
    updatedAt: now,
  };
  writeLock(lock, cwd, basePath);
}

/**
 * Remove an agent entry from the lock file.
 * @param {string} agentName
 * @param {string} [cwd]
 * @param {string} [basePath]  manifest base_path override
 */
export function removeLockEntry(agentName, cwd = process.cwd(), basePath) {
  const lock = readLock(cwd, basePath);
  delete lock[agentName];
  writeLock(lock, cwd, basePath);
}

// ─── State detection ─────────────────────────────────────────────────────────

/**
 * Resolve the on-disk path for an agent entry.
 * - mode 'primary': `{basePath}/{name}.md`
 * - mode 'all':     primary path first, falls back to subagent path
 * - mode 'subagent' (default): `{basePath}/{category}/{name}.md`
 *
 * @param {string} cwd
 * @param {string} basePath
 * @param {{ name: string, category?: string, mode?: string }} agent
 * @returns {string}
 */
function resolveAgentPath(cwd, basePath, agent) {
  if (agent.mode === 'primary') {
    return join(cwd, basePath, `${agent.name}.md`);
  }
  if (agent.mode === 'all') {
    const primary = join(cwd, basePath, `${agent.name}.md`);
    if (existsSync(primary)) return primary;
    return join(cwd, basePath, agent.category || '', `${agent.name}.md`);
  }
  // subagent (default)
  return join(cwd, basePath, agent.category || '', `${agent.name}.md`);
}

/**
 * Recursively scan basePath for .md files not already tracked in `known`.
 * Returns an array of { name, filePath, relativePath } for each discovered file.
 *
 * Security: symlinks are silently skipped and resolved paths must stay inside absBase.
 *
 * @param {string} cwd
 * @param {string} basePath
 * @param {Set<string>} known  agent names already tracked
 * @returns {Array<{ name: string, filePath: string, relativePath: string }>}
 */
function scanLocalAgents(cwd, basePath, known) {
  const absBase = join(cwd, basePath);
  if (!existsSync(absBase)) return [];

  /** @type {Array<{ name: string, filePath: string, relativePath: string }>} */
  const found = [];

  /** @type {string[]} */
  let entries;
  try {
    entries = /** @type {string[]} */ (readdirSync(absBase, { recursive: true }));
  } catch (err) {
    // ELOOP: symlink cycle — bail out gracefully
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ELOOP') return [];
    throw err;
  }

  const resolvedBase = realpathSync(absBase);

  for (const entry of entries) {
    const rel = typeof entry === 'string' ? entry : entry.toString();
    if (!rel.endsWith('.md')) continue;

    const filePath = join(absBase, rel);

    // SEC-04: skip symlinks
    try {
      if (lstatSync(filePath).isSymbolicLink()) continue;
    } catch { continue; }

    // SEC: containment check — resolved path must stay within agents dir
    try {
      const real = realpathSync(filePath);
      if (!real.startsWith(resolvedBase + '/') && real !== resolvedBase) continue;
    } catch { continue; }

    // Extract agent name from filename (strip path + .md), handle both / and \
    const name = rel.split(/[\\/]/).pop().replace(/\.md$/, '');
    if (!name || !SAFE_NAME_RE.test(name)) continue;
    if (known.has(name)) continue;
    found.push({ name, filePath, relativePath: rel });
  }
  return found;
}

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
  const basePath = manifest.base_path || '.opencode/agents';
  const lock = readLock(cwd, basePath);
  const states = new Map();

  for (const agent of manifest.agents) {
    const filePath = resolveAgentPath(cwd, basePath, agent);

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

  // Filesystem scan: pick up local .md files not in the manifest
  const known = new Set(states.keys());
  for (const { name } of scanLocalAgents(cwd, basePath, known)) {
    states.set(name, 'unknown');
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
  const basePath = manifest.base_path || '.opencode/agents';
  const lock = readLock(cwd, basePath);
  const agentMap = new Map(manifest.agents.map((a) => [a.name, a]));

  /** @type {string[]} */ const ok = [];
  /** @type {string[]} */ const mismatch = [];
  /** @type {string[]} */ const missing = [];

  for (const [name, entry] of Object.entries(lock)) {
    const agent = agentMap.get(name);
    const rp = entry.relativePath;
    const safeRelPath = rp && typeof rp === 'string' && !rp.includes('..') && !rp.startsWith('/') && !rp.startsWith('\\') ? rp : null;
    const filePath = agent
      ? resolveAgentPath(cwd, basePath, agent)
      : safeRelPath
        ? join(cwd, basePath, safeRelPath)
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
    const filePath = resolveAgentPath(cwd, basePath, agent);

    if (!existsSync(filePath)) continue;

    const content = readFileSync(filePath, 'utf-8');
    lock[agent.name] = {
      sha256: sha256(content),
      installedAt: now,
      updatedAt: now,
    };
  }

  // Filesystem scan: pick up local .md files not in the manifest
  const known = new Set(Object.keys(lock));
  for (const manifestAgent of manifest.agents) known.add(manifestAgent.name);
  for (const { name, filePath, relativePath } of scanLocalAgents(cwd, basePath, known)) {
    const content = readFileSync(filePath, 'utf-8');
    lock[name] = {
      sha256: sha256(content),
      installedAt: now,
      updatedAt: now,
      relativePath,
    };
  }

  writeLock(lock, cwd, basePath);
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
  const basePath = manifest.base_path || '.opencode/agents';
  const lock = readLock(cwd, basePath);
  let changed = false;

  for (const agent of manifest.agents) {
    if (lock[agent.name]) continue;

    const filePath = resolveAgentPath(cwd, basePath, agent);

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

  // Filesystem scan: pick up local .md files not in the manifest
  const known = new Set(Object.keys(lock));
  for (const manifestAgent of manifest.agents) known.add(manifestAgent.name);
  for (const { name, filePath, relativePath } of scanLocalAgents(cwd, basePath, known)) {
    if (lock[name]) continue;
    const content = readFileSync(filePath, 'utf-8');
    const now = new Date().toISOString();
    lock[name] = {
      sha256: sha256(content),
      installedAt: now,
      updatedAt: now,
      relativePath,
    };
    changed = true;
  }

  if (changed) writeLock(lock, cwd, basePath);
  return changed;
}
