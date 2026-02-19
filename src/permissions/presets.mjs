/**
 * Permission presets for OpenCode agents.
 * Defines the 17 permissions, valid actions, and 4 preset profiles.
 * @module permissions/presets
 */

/** @type {readonly string[]} All 17 OpenCode permission names. */
export const PERMISSION_NAMES = Object.freeze([
  'read', 'write', 'edit', 'bash', 'glob', 'grep',
  'webfetch', 'task', 'mcp', 'todoread', 'todowrite',
  'distill', 'prune', 'sequentialthinking', 'memory',
  'browsermcp', 'skill',
]);

/** @type {readonly string[]} Valid permission actions. */
export const ACTION_ALLOWLIST = Object.freeze(['allow', 'ask', 'deny']);

/**
 * @typedef {string | Record<string, string>} PermissionValue
 * A permission value is either a flat action string or a pattern-based map
 * (e.g. `{ '*': 'ask', 'git status*': 'allow' }`).
 */

/**
 * @typedef {Record<string, PermissionValue>} Preset
 * Maps each permission name to its action or pattern map.
 */

/** @type {Readonly<Record<string, Readonly<Preset>>>} The 4 built-in presets. */
export const PRESETS = Object.freeze({
  strict: Object.freeze({
    read: 'allow',
    write: 'deny',
    edit: 'deny',
    bash: 'deny',
    glob: 'allow',
    grep: 'allow',
    webfetch: 'deny',
    task: 'deny',
    mcp: 'deny',
    todoread: 'allow',
    todowrite: 'allow',
    distill: 'allow',
    prune: 'allow',
    sequentialthinking: 'allow',
    memory: 'ask',
    browsermcp: 'deny',
    skill: 'allow',
  }),
  balanced: Object.freeze({
    read: 'allow',
    write: 'allow',
    edit: 'allow',
    bash: Object.freeze({ '*': 'ask', 'git status*': 'allow', 'git diff*': 'allow', 'git log*': 'allow' }),
    glob: 'allow',
    grep: 'allow',
    webfetch: 'allow',
    task: Object.freeze({ '*': 'allow' }),
    mcp: 'ask',
    todoread: 'allow',
    todowrite: 'allow',
    distill: 'allow',
    prune: 'allow',
    sequentialthinking: 'allow',
    memory: 'allow',
    browsermcp: 'ask',
    skill: 'allow',
  }),
  permissive: Object.freeze({
    read: 'allow',
    write: 'allow',
    edit: 'allow',
    bash: Object.freeze({ '*': 'allow' }),
    glob: 'allow',
    grep: 'allow',
    webfetch: 'allow',
    task: Object.freeze({ '*': 'allow' }),
    mcp: 'allow',
    todoread: 'allow',
    todowrite: 'allow',
    distill: 'allow',
    prune: 'allow',
    sequentialthinking: 'allow',
    memory: 'allow',
    browsermcp: 'allow',
    skill: 'allow',
  }),
  yolo: Object.freeze({
    read: 'allow',
    write: 'allow',
    edit: 'allow',
    bash: Object.freeze({ '*': 'allow' }),
    glob: 'allow',
    grep: 'allow',
    webfetch: 'allow',
    task: Object.freeze({ '*': 'allow' }),
    mcp: 'allow',
    todoread: 'allow',
    todowrite: 'allow',
    distill: 'allow',
    prune: 'allow',
    sequentialthinking: 'allow',
    memory: 'allow',
    browsermcp: 'allow',
    skill: 'allow',
  }),
});

/** @type {readonly string[]} Names of all available presets. */
export const PRESET_NAMES = Object.freeze(Object.keys(PRESETS));

/**
 * Returns a shallow copy of the named preset.
 * Pattern-based maps (bash, task) are copied by reference — the originals are frozen.
 * @param {string} name — Preset name (strict | balanced | permissive | yolo).
 * @returns {Preset}
 */
export function getPreset(name) {
  const preset = PRESETS[name];
  if (!preset) throw new Error(`Unknown preset: ${name}`);
  return { ...preset };
}

/**
 * Checks whether the given string is a valid permission action.
 * @param {string} action
 * @returns {boolean}
 */
export function isValidAction(action) {
  return ACTION_ALLOWLIST.includes(action);
}

/**
 * Checks whether the given string is a recognised permission name.
 * @param {string} name
 * @returns {boolean}
 */
export function isValidPermission(name) {
  return PERMISSION_NAMES.includes(name);
}
