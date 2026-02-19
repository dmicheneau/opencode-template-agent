/**
 * Permission preferences persistence — load/save user defaults.
 * File location: ${XDG_CONFIG_HOME || ~/.config}/opencode/permission-preferences.json
 * Atomic writes (temp + rename), 0o600 permissions, never persists yolo.
 * @module permissions/persistence
 */

import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from 'node:fs';
import { PRESET_NAMES, isValidAction, isValidPermission } from './presets.mjs';

const PREFS_FILENAME = 'permission-preferences.json';
const CURRENT_VERSION = 1;

/**
 * Get the preferences file path.
 * Uses XDG_CONFIG_HOME if set, otherwise ~/.config.
 * @returns {string}
 */
export function getPreferencesPath() {
  const configBase = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(configBase, 'opencode', PREFS_FILENAME);
}

/**
 * Validate a single override entry.
 * @param {unknown} entry
 * @returns {boolean}
 */
function isValidOverride(entry) {
  if (entry === null || typeof entry !== 'object') return false;
  const { agent, permission, action } = /** @type {Record<string, unknown>} */ (entry);
  if (agent !== null && typeof agent !== 'string') return false;
  if (typeof permission !== 'string' || !isValidPermission(permission)) return false;
  if (typeof action !== 'string' || !isValidAction(action)) return false;
  return true;
}

/**
 * Validate parsed preferences against the schema.
 * @param {unknown} data
 * @returns {{ preset?: string, overrides?: Array<{agent: string|null, permission: string, action: string}> } | null}
 *   null if validation fails
 */
function validatePreferences(data) {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;

  const obj = /** @type {Record<string, unknown>} */ (data);

  if (obj.version !== CURRENT_VERSION) return null;

  if (obj.preset !== undefined) {
    if (typeof obj.preset !== 'string') return null;
    if (!PRESET_NAMES.includes(obj.preset)) return null;
    if (obj.preset === 'yolo') return null;
  }

  if (obj.overrides !== undefined) {
    if (!Array.isArray(obj.overrides)) return null;
    for (const entry of obj.overrides) {
      if (!isValidOverride(entry)) return null;
    }
  }

  /** @type {{ preset?: string, overrides?: Array<{agent: string|null, permission: string, action: string}> }} */
  const result = {};
  if (obj.preset !== undefined) result.preset = /** @type {string} */ (obj.preset);
  if (obj.overrides !== undefined) result.overrides = /** @type {Array<{agent: string|null, permission: string, action: string}>} */ (obj.overrides);
  return result;
}

/**
 * Load saved permission preferences.
 * Returns null if no file exists, JSON is corrupt, or schema validation fails.
 * Logs a warning to stderr on parse/validation errors (silent on missing file).
 * @returns {{ preset?: string, overrides?: Array<{agent: string|null, permission: string, action: string}> } | null}
 */
export function loadPreferences() {
  const filePath = getPreferencesPath();

  if (!existsSync(filePath)) return null;

  /** @type {string} */
  let raw;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    process.stderr.write(`[opencode] Warning: could not read preferences file: ${err.message}\n`);
    return null;
  }

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    process.stderr.write(`[opencode] Warning: preferences file contains invalid JSON, starting fresh.\n`);
    return null;
  }

  const validated = validatePreferences(parsed);
  if (!validated) {
    process.stderr.write(`[opencode] Warning: preferences file failed validation, starting fresh.\n`);
    return null;
  }

  return validated;
}

/**
 * Save permission preferences atomically.
 * Writes to a temp file then renames into place. File mode is 0o600.
 * Throws if preset is 'yolo' — use --yolo flag for one-time use instead.
 * @param {{ preset?: string, overrides?: Array<{agent: string|null, permission: string, action: string}> }} preferences
 */
export function savePreferences(preferences) {
  if (preferences.preset === 'yolo') {
    throw new Error('YOLO preset cannot be saved as default. Use --yolo flag for one-time use.');
  }

  const filePath = getPreferencesPath();
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  /** @type {Record<string, unknown>} */
  const payload = { version: CURRENT_VERSION };
  if (preferences.preset !== undefined) payload.preset = preferences.preset;
  if (preferences.overrides !== undefined) payload.overrides = preferences.overrides;

  const json = JSON.stringify(payload, null, 2) + '\n';
  const tmpPath = filePath + '.tmp';

  writeFileSync(tmpPath, json, { mode: 0o600 });
  renameSync(tmpPath, filePath);
}

/**
 * Delete saved preferences.
 * No-op if the file doesn't exist.
 */
export function clearPreferences() {
  const filePath = getPreferencesPath();

  if (!existsSync(filePath)) return;

  try {
    unlinkSync(filePath);
  } catch (err) {
    process.stderr.write(`[opencode] Warning: could not delete preferences file: ${err.message}\n`);
  }
}
