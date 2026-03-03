/**
 * Ambient type declarations for src/*.mjs modules.
 *
 * This file has NO top-level exports — keeping it as a global declaration file
 * so that `declare module` blocks are true ambient module declarations,
 * not module augmentations.
 */

// ─── Shared types ─────────────────────────────────────────────────────────

interface AgentEntry {
  name: string;
  category: string;
  path: string;
  mode: "primary" | "subagent";
  description: string;
  tags: string[];
}

interface CategoryMeta {
  label: string;
  icon: string;
  description: string;
}

interface PackDef {
  label: string;
  description: string;
  agents: string[];
}

interface Manifest {
  version: string;
  repo: string;
  branch: string;
  base_path: string;
  source_path?: string;
  agent_count: number;
  categories: Record<string, CategoryMeta>;
  agents: AgentEntry[];
  packs: Record<string, PackDef>;
}

type AgentState = "installed" | "outdated" | "new" | "unknown";

interface LockEntry {
  sha256: string;
  installedAt: string;
  updatedAt: string;
  relativePath?: string;
}

type LockData = Record<string, LockEntry>;

// ─── src/registry.mjs ────────────────────────────────────────────────────

declare module "../src/registry.mjs" {
  export const SAFE_NAME_RE: RegExp;
  export function validateManifest(manifest: Manifest): void;
  export function loadManifest(): Manifest;
  export function clearManifestCache(): void;
  export function getAgent(name: string): AgentEntry | undefined;
  export function getCategory(category: string): AgentEntry[];
  export function getCategoryIds(): string[];
  export function getPack(name: string): PackDef | undefined;
  export function resolvePackAgents(name: string): AgentEntry[];
  export function searchAgents(query: string): AgentEntry[];
  export function listAll(): AgentEntry[];
  export function getManifest(): Manifest;
}

// ─── src/lock.mjs ─────────────────────────────────────────────────────────

declare module "../src/lock.mjs" {
  export function sha256(content: string | Buffer): string;
  export function detectAgentStates(manifest: Manifest, cwd?: string): Map<string, AgentState>;
  export function detectInstalledSet(manifest: Manifest, cwd?: string): Set<string>;
  export function findOutdatedAgents(manifest: Manifest, cwd?: string): AgentEntry[];
  export function verifyLockIntegrity(
    manifest: Manifest,
    cwd?: string
  ): { ok: string[]; mismatch: string[]; missing: string[] };
}
