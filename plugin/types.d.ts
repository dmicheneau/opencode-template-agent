/**
 * Ambient type declarations for src/*.mjs modules.
 *
 * All shared interfaces/types are prefixed with `Oc` (OpenCode) to avoid
 * collisions in the global namespace — e.g. `OcAgentEntry`, `OcManifest`.
 *
 * This file has NO top-level exports — keeping it as a global declaration file
 * so that `declare module` blocks are true ambient module declarations,
 * not module augmentations.
 */

// ─── Shared types ─────────────────────────────────────────────────────────

interface OcAgentEntry {
  name: string;
  category: string;
  path: string;
  mode: "primary" | "subagent";
  description: string;
  tags: string[];
}

interface OcCategoryMeta {
  label: string;
  icon: string;
  description: string;
}

interface OcPackDef {
  label: string;
  description: string;
  agents: string[];
}

interface OcManifest {
  version: string;
  repo: string;
  branch: string;
  base_path: string;
  source_path?: string;
  agent_count: number;
  categories: Record<string, OcCategoryMeta>;
  agents: OcAgentEntry[];
  packs: Record<string, OcPackDef>;
}

type OcAgentState = "installed" | "outdated" | "new" | "unknown";

interface OcLockEntry {
  sha256: string;
  installedAt: string;
  updatedAt: string;
  relativePath?: string;
}

type OcLockData = Record<string, OcLockEntry>;

// ─── src/registry.mjs ────────────────────────────────────────────────────

declare module "../src/registry.mjs" {
  export const SAFE_NAME_RE: RegExp;
  export function validateManifest(manifest: OcManifest): void;
  export function loadManifest(): OcManifest;
  export function clearManifestCache(): void;
  export function getAgent(name: string): OcAgentEntry | undefined;
  export function getCategory(category: string): OcAgentEntry[];
  export function getCategoryIds(): string[];
  export function getPack(name: string): OcPackDef | undefined;
  export function resolvePackAgents(name: string): OcAgentEntry[];
  export function searchAgents(query: string): OcAgentEntry[];
  export function listAll(): OcAgentEntry[];
  export function getManifest(): OcManifest;
}

// ─── src/lock.mjs ─────────────────────────────────────────────────────────

declare module "../src/lock.mjs" {
  export function sha256(content: string | Buffer): string;
  export function detectAgentStates(manifest: OcManifest, cwd?: string): Map<string, OcAgentState>;
  export function detectInstalledSet(manifest: OcManifest, cwd?: string): Set<string>;
  export function findOutdatedAgents(manifest: OcManifest, cwd?: string): OcAgentEntry[];
  export function verifyLockIntegrity(
    manifest: OcManifest,
    cwd?: string
  ): { ok: string[]; mismatch: string[]; missing: string[] };
}
