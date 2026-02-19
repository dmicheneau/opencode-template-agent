// src/permissions/cli.mjs — V7.0 CLI permission flag parsing (S4.9 + S4.17)
// Zero dependencies, ESM only.

import { PRESET_NAMES, isValidPermission, isValidAction } from './presets.mjs';
import { SAFE_NAME_RE } from '../registry.mjs';

// ── Override spec parsing ────────────────────────────────────────────────────

/**
 * Parse a single override spec string.
 *
 * Format: `[agent:]permission=action`
 *
 * Examples:
 *   "bash=allow"          → { agent: null, permission: 'bash', action: 'allow' }
 *   "my-agent:write=deny" → { agent: 'my-agent', permission: 'write', action: 'deny' }
 *
 * @param {string} spec
 * @returns {{ agent: string | null, permission: string, action: string }}
 * @throws {Error} if spec is invalid
 */
export function parseOverrideSpec(spec) {
  if (typeof spec !== 'string' || spec.length === 0) {
    throw new Error('Override spec must be a non-empty string');
  }

  const eqIdx = spec.indexOf('=');
  if (eqIdx === -1) {
    throw new Error(
      `Invalid override spec "${spec}": expected format [agent:]permission=action`,
    );
  }

  const left = spec.slice(0, eqIdx);
  const action = spec.slice(eqIdx + 1);

  if (!left || !action) {
    throw new Error(
      `Invalid override spec "${spec}": expected format [agent:]permission=action`,
    );
  }

  // Validate action
  if (!isValidAction(action)) {
    throw new Error(
      `Invalid action "${action}" in override spec "${spec}". Valid actions: allow, ask, deny`,
    );
  }

  // Split left side on the *first* colon for agent:permission
  let agent = null;
  let permission;

  const colonIdx = left.indexOf(':');
  if (colonIdx !== -1) {
    agent = left.slice(0, colonIdx);
    permission = left.slice(colonIdx + 1);

    if (!agent) {
      throw new Error(
        `Invalid override spec "${spec}": agent name before ":" is empty`,
      );
    }
    if (!SAFE_NAME_RE.test(agent)) {
      throw new Error(
        `Invalid agent name "${agent}" in override spec "${spec}". Must match ${SAFE_NAME_RE}`,
      );
    }
  } else {
    permission = left;
  }

  if (!isValidPermission(permission)) {
    throw new Error(
      `Unknown permission "${permission}" in override spec "${spec}". ` +
        'Run --help to see valid permission names',
    );
  }

  return { agent, permission, action };
}

// ── Flag parsing ─────────────────────────────────────────────────────────────

/**
 * Parse permission-related flags from CLI args.
 *
 * Expects args to be already normalized for `--flag=value` form
 * (split into `['--flag', 'value']`).
 *
 * @param {string[]} args - Raw CLI arguments
 * @returns {{
 *   preset: string | null,
 *   yolo: boolean,
 *   overrides: Array<{agent: string | null, permission: string, action: string}>,
 *   savePermissions: boolean,
 *   noSavedPermissions: boolean,
 *   noInteractive: boolean,
 * }}
 */
export function parsePermissionFlags(args) {
  /** @type {string | null} */
  let preset = null;
  let yolo = false;
  /** @type {Array<{agent: string | null, permission: string, action: string}>} */
  const overrides = [];
  let savePermissions = false;
  let noSavedPermissions = false;
  let noInteractive = false;

  // Normalize --flag=value into ['--flag', 'value']
  const normalized = [];
  for (const arg of args) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const idx = arg.indexOf('=');
      normalized.push(arg.slice(0, idx), arg.slice(idx + 1));
    } else {
      normalized.push(arg);
    }
  }

  for (let i = 0; i < normalized.length; i++) {
    const arg = normalized[i];

    switch (arg) {
      case '--yolo':
        yolo = true;
        break;

      case '--permissions': {
        const value = normalized[++i];
        if (value === undefined || value.startsWith('--')) {
          throw new Error('--permissions requires a preset name (strict | balanced | permissive | yolo)');
        }
        if (!PRESET_NAMES.includes(value)) {
          throw new Error(
            `Unknown preset "${value}". Valid presets: ${PRESET_NAMES.join(', ')}`,
          );
        }
        preset = value;
        break;
      }

      case '--permission-override': {
        const value = normalized[++i];
        if (value === undefined || value.startsWith('--')) {
          throw new Error(
            '--permission-override requires a spec (e.g., bash=allow or agent:write=deny)',
          );
        }
        overrides.push(parseOverrideSpec(value));
        break;
      }

      case '--save-permissions':
        savePermissions = true;
        break;

      case '--no-saved-permissions':
        noSavedPermissions = true;
        break;

      case '--no-interactive':
        noInteractive = true;
        break;

      // Ignore unknown flags — they belong to other parsers
      default:
        break;
    }
  }

  return { preset, yolo, overrides, savePermissions, noSavedPermissions, noInteractive };
}
