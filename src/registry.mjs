import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';

// ─── Types (JSDoc) ──────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   name: string;
 *   category: string;
 *   path: string;
 *   mode: 'primary' | 'subagent';
 *   description: string;
 *   tags: string[];
 * }} AgentEntry
 */

/**
 * @typedef {{
 *   label: string;
 *   icon: string;
 *   description: string;
 * }} CategoryMeta
 */

/**
 * @typedef {{
 *   label: string;
 *   description: string;
 *   agents: string[];
 * }} PackDef
 */

/**
 * @typedef {{
 *   version: string;
 *   repo: string;
 *   branch: string;
 *   base_path: string;
 *   source_path?: string;
 *   agent_count: number;
 *   categories: Record<string, CategoryMeta>;
 *   agents: AgentEntry[];
 *   packs: Record<string, PackDef>;
 * }} Manifest
 */

// ─── Load manifest ──────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MANIFEST_PATH = join(__dirname, '..', 'manifest.json');

/** @type {Manifest | null} */
let _cached = null;

/** @type {number} */
let _cachedMtime = 0;

export const SAFE_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;

/**
 * Validate manifest schema for security-sensitive fields.
 * @param {Manifest} manifest
 */
export function validateManifest(manifest) {
  // Validate base_path
  if (typeof manifest.base_path !== 'string' || manifest.base_path.includes('..') || isAbsolute(manifest.base_path)) {
    throw new Error(`Invalid manifest base_path: "${manifest.base_path}"`);
  }
  if (manifest.base_path.includes('\0')) {
    throw new Error(`Invalid null byte in base_path`);
  }

  // Validate source_path (optional — used for download URLs when source differs from install path)
  if (manifest.source_path !== undefined) {
    if (typeof manifest.source_path !== 'string' || manifest.source_path === '' || manifest.source_path.trim() === '' || manifest.source_path.includes('..') || isAbsolute(manifest.source_path)) {
      throw new Error(`Invalid manifest source_path: "${manifest.source_path}"`);
    }
    if (manifest.source_path.includes('\0')) {
      throw new Error(`Invalid null byte in source_path`);
    }
  }

  // Validate agents
  const agents = manifest.agents;
  for (const agent of agents) {
    if (!SAFE_NAME_RE.test(agent.name || '')) {
      throw new Error(`Invalid agent name: "${agent.name}"`);
    }
    if (agent.category && !SAFE_NAME_RE.test(agent.category)) {
      throw new Error(`Invalid category for "${agent.name}": "${agent.category}"`);
    }
    if (agent.path != null && isAbsolute(agent.path)) {
      throw new Error(`Agent "${agent.name}": path must be relative, got "${agent.path}"`);
    }
    if (agent.path && agent.path.includes('..')) {
      throw new Error(`Agent path contains "..": "${agent.path}"`);
    }
    if (agent.path != null && agent.path.includes('\0')) {
      throw new Error(`Invalid null byte in agent path: "${agent.name}"`);
    }
  }
}

/**
 * Load and cache the manifest.
 * Uses mtime-based invalidation: if the file changed on disk, reload.
 * @returns {Manifest}
 */
export function loadManifest() {
  let stat;
  try {
    stat = statSync(MANIFEST_PATH, { throwIfNoEntry: false });
  } catch {
    stat = null; // treat permission/access errors as cache miss
  }
  if (!stat) {
    throw new Error(`Manifest not found at ${MANIFEST_PATH}`);
  }

  const mtime = stat.mtimeMs;
  if (_cached && mtime === _cachedMtime) return _cached;

  /** @type {Manifest} */
  let manifest;
  try {
    const raw = readFileSync(MANIFEST_PATH, 'utf-8');
    manifest = /** @type {Manifest} */ (JSON.parse(raw));
  } catch (err) {
    throw new Error(
      `Failed to load manifest at ${MANIFEST_PATH}: ${/** @type {Error} */ (err).message}`
    );
  }

  validateManifest(manifest); // validation errors propagate directly
  _cached = manifest;
  _cachedMtime = mtime;
  return _cached;
}

/**
 * Clear the manifest cache. Useful for tests and after sync operations.
 */
export function clearManifestCache() {
  _cached = null;
  _cachedMtime = 0;
}

// ─── Query helpers ──────────────────────────────────────────────────────────────

/**
 * Get a single agent by exact name.
 * @param {string} name
 * @returns {AgentEntry | undefined}
 */
export function getAgent(name) {
  const manifest = loadManifest();
  return manifest.agents.find((a) => a.name === name);
}

/**
 * Get all agents in a category.
 * @param {string} category
 * @returns {AgentEntry[]}
 */
export function getCategory(category) {
  const manifest = loadManifest();
  return manifest.agents.filter((a) => a.category === category);
}

/**
 * Get all category IDs.
 * @returns {string[]}
 */
export function getCategoryIds() {
  const manifest = loadManifest();
  return Object.keys(manifest.categories);
}

/**
 * Get a pack definition by name.
 * @param {string} name
 * @returns {PackDef | undefined}
 */
export function getPack(name) {
  const manifest = loadManifest();
  return manifest.packs[name];
}

/**
 * Resolve a pack to its list of AgentEntry objects.
 * @param {string} name
 * @returns {AgentEntry[]}
 */
export function resolvePackAgents(name) {
  const manifest = loadManifest();
  const pack = manifest.packs[name];
  if (!pack) return [];

  return pack.agents
    .map((agentName) => manifest.agents.find((a) => a.name === agentName))
    .filter(/** @returns {a is AgentEntry} */ (a) => a !== undefined);
}

/**
 * Search agents by name, description, tags, or category.
 * @param {string} query
 * @returns {AgentEntry[]}
 */
export function searchAgents(query) {
  const manifest = loadManifest();
  const q = query.toLowerCase().trim();

  if (!q) return [];

  return manifest.agents.filter((agent) => {
    if (agent.name.toLowerCase().includes(q)) return true;
    if (agent.description.toLowerCase().includes(q)) return true;
    if (agent.category.toLowerCase().includes(q)) return true;
    if (agent.tags.some((tag) => tag.toLowerCase().includes(q))) return true;
    return false;
  });
}

/**
 * Return all agents.
 * @returns {AgentEntry[]}
 */
export function listAll() {
  return loadManifest().agents;
}

/**
 * Return the full manifest.
 * @returns {Manifest}
 */
export function getManifest() {
  return loadManifest();
}
