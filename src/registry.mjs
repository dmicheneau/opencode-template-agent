import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

/**
 * Load and cache the manifest.
 * @returns {Manifest}
 */
export function loadManifest() {
  if (_cached) return _cached;

  try {
    const raw = readFileSync(MANIFEST_PATH, 'utf-8');
    _cached = JSON.parse(raw);
    return /** @type {Manifest} */ (_cached);
  } catch (err) {
    throw new Error(
      `Failed to load manifest at ${MANIFEST_PATH}: ${/** @type {Error} */ (err).message}`
    );
  }
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
