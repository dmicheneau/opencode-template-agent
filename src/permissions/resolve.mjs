// src/permissions/resolve.mjs — V7.0 permission resolution with layered precedence (S4.10)
// Zero dependencies, ESM only.

import { getPreset } from './presets.mjs';

/**
 * Deep-clone a permission map so we can mutate without affecting frozen presets.
 *
 * @param {Record<string, string | Record<string, string>>} perms
 * @returns {Record<string, string | Record<string, string>>}
 */
function clonePermissions(perms) {
  /** @type {Record<string, string | Record<string, string>>} */
  const out = {};
  for (const [key, value] of Object.entries(perms)) {
    out[key] = typeof value === 'object' && value !== null ? { ...value } : value;
  }
  return out;
}

/**
 * Apply a single override onto a mutable permission map.
 *
 * If override says `bash=allow`, the entire `bash` entry is replaced with the
 * string `'allow'` (even if it was previously a pattern-based map).
 *
 * @param {Record<string, string | Record<string, string>>} perms - Mutated in place
 * @param {{ permission: string, action: string }} override
 */
function applyOverride(perms, override) {
  perms[override.permission] = override.action;
}

/**
 * Resolve final permissions for an agent with layered precedence.
 *
 * Precedence (highest to lowest):
 *   1. CLI overrides (`--permission-override`)
 *   2. CLI preset (`--permissions` / `--yolo`)
 *   3. Saved preferences
 *   4. Agent's built-in permissions (from frontmatter)
 *
 * Returns `null` when no layer provides modifications — meaning
 * "use whatever the agent file already has".
 *
 * @param {{
 *   builtIn?: Record<string, string | Record<string, string>>,
 *   savedPreferences?: { preset?: string, overrides?: Array<{agent: string | null, permission: string, action: string}> },
 *   cliPreset?: string | null,
 *   cliYolo?: boolean,
 *   cliOverrides?: Array<{agent: string | null, permission: string, action: string}>,
 *   agentName?: string,
 * }} options
 * @returns {Record<string, string | Record<string, string>> | null}
 *   `null` means "use built-in" (no modifications needed)
 */
export function resolvePermissions(options = {}) {
  const {
    builtIn,
    savedPreferences,
    cliPreset = null,
    cliYolo = false,
    cliOverrides = [],
    agentName,
  } = options;

  /** @type {Record<string, string | Record<string, string>> | null} */
  let result = null;

  // ── Layer 4 (lowest): built-in is the implicit fallback — we don't copy it
  //    unless a higher layer needs to modify on top of it.

  // ── Layer 3: saved preferences
  if (savedPreferences) {
    if (savedPreferences.preset) {
      result = getPreset(savedPreferences.preset);
    }

    // Apply saved overrides that match this agent (or are global)
    if (savedPreferences.overrides && savedPreferences.overrides.length > 0) {
      if (!result && builtIn) {
        result = clonePermissions(builtIn);
      } else if (!result) {
        // No base to apply overrides onto — skip saved overrides without a base
        // (they'd be meaningless without a starting permission set)
      }

      if (result) {
        for (const ov of savedPreferences.overrides) {
          if (ov.agent === null || ov.agent === agentName) {
            applyOverride(result, ov);
          }
        }
      }
    }
  }

  // ── Layer 2: CLI preset (--permissions / --yolo)
  if (cliYolo) {
    result = getPreset('yolo');
  } else if (cliPreset) {
    result = getPreset(cliPreset);
  }

  // ── Layer 1 (highest): CLI overrides
  if (cliOverrides.length > 0) {
    // Need a base to apply overrides onto
    if (!result) {
      result = builtIn ? clonePermissions(builtIn) : {};
    }

    for (const ov of cliOverrides) {
      if (ov.agent === null || ov.agent === agentName) {
        applyOverride(result, ov);
      }
    }
  }

  return result;
}
