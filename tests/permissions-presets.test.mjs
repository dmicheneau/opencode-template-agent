import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PERMISSION_NAMES,
  ACTION_ALLOWLIST,
  PRESETS,
  PRESET_NAMES,
  getPreset,
  isValidAction,
  isValidPermission,
} from '../src/permissions/presets.mjs';

// ─── PERMISSION_NAMES ────────────────────────────────────────────────────────

describe('PERMISSION_NAMES', () => {
  it('should contain exactly 17 permissions', () => {
    assert.equal(PERMISSION_NAMES.length, 17);
  });

  it('should include all expected permission names', () => {
    const expected = [
      'read', 'write', 'edit', 'bash', 'glob', 'grep',
      'webfetch', 'task', 'mcp', 'todoread', 'todowrite',
      'distill', 'prune', 'sequentialthinking', 'memory',
      'browsermcp', 'skill',
    ];
    for (const name of expected) {
      assert.ok(PERMISSION_NAMES.includes(name), `missing: ${name}`);
    }
  });

  it('should be frozen', () => {
    assert.ok(Object.isFrozen(PERMISSION_NAMES));
  });
});

// ─── PRESETS existence & structure ────────────────────────────────────────────

describe('PRESETS', () => {
  it('should have exactly 4 presets', () => {
    assert.equal(PRESET_NAMES.length, 4);
    assert.deepEqual([...PRESET_NAMES].sort(), ['balanced', 'permissive', 'strict', 'yolo']);
  });

  for (const name of ['strict', 'balanced', 'permissive', 'yolo']) {
    it(`"${name}" should have all 17 permissions`, () => {
      const preset = PRESETS[name];
      const keys = Object.keys(preset);
      assert.equal(keys.length, 17, `${name} has ${keys.length} keys, expected 17`);
      for (const perm of PERMISSION_NAMES) {
        assert.ok(perm in preset, `${name} missing permission: ${perm}`);
      }
    });

    it(`"${name}" values should all be valid actions or objects with valid actions`, () => {
      const preset = PRESETS[name];
      for (const [key, value] of Object.entries(preset)) {
        if (typeof value === 'string') {
          assert.ok(ACTION_ALLOWLIST.includes(value),
            `${name}.${key} = "${value}" is not a valid action`);
        } else if (typeof value === 'object' && value !== null) {
          for (const [pattern, action] of Object.entries(value)) {
            assert.ok(ACTION_ALLOWLIST.includes(action),
              `${name}.${key}["${pattern}"] = "${action}" is not a valid action`);
          }
        } else {
          assert.fail(`${name}.${key} has unexpected type: ${typeof value}`);
        }
      }
    });
  }

  it('should be frozen (top-level)', () => {
    assert.ok(Object.isFrozen(PRESETS));
    assert.throws(() => {
      'use strict';
      /** @type {any} */ (PRESETS).custom = {};
    }, TypeError);
  });

  it('each preset should be frozen', () => {
    for (const name of PRESET_NAMES) {
      assert.ok(Object.isFrozen(PRESETS[name]), `${name} preset is not frozen`);
    }
  });
});

// ─── strict preset specifics ─────────────────────────────────────────────────

describe('strict preset', () => {
  const strict = PRESETS.strict;

  it('should have bash as deny', () => {
    assert.equal(strict.bash, 'deny');
  });

  it('should have write and edit as deny', () => {
    assert.equal(strict.write, 'deny');
    assert.equal(strict.edit, 'deny');
  });

  it('should have mostly deny/ask for dangerous permissions', () => {
    assert.equal(strict.webfetch, 'deny');
    assert.equal(strict.task, 'deny');
    assert.equal(strict.mcp, 'deny');
    assert.equal(strict.browsermcp, 'deny');
    assert.equal(strict.memory, 'ask');
  });

  it('should allow read-only permissions', () => {
    assert.equal(strict.read, 'allow');
    assert.equal(strict.glob, 'allow');
    assert.equal(strict.grep, 'allow');
    assert.equal(strict.todoread, 'allow');
  });
});

// ─── balanced preset specifics ───────────────────────────────────────────────

describe('balanced preset', () => {
  const balanced = PRESETS.balanced;

  it('should have bash as an object with git patterns', () => {
    assert.equal(typeof balanced.bash, 'object');
    const bash = /** @type {Record<string, string>} */ (balanced.bash);
    assert.equal(bash['*'], 'ask');
    assert.equal(bash['git status*'], 'allow');
    assert.equal(bash['git diff*'], 'allow');
    assert.equal(bash['git log*'], 'allow');
  });

  it('should have task as object with wildcard allow', () => {
    assert.equal(typeof balanced.task, 'object');
    const task = /** @type {Record<string, string>} */ (balanced.task);
    assert.equal(task['*'], 'allow');
  });

  it('should have mcp as ask', () => {
    assert.equal(balanced.mcp, 'ask');
  });
});

// ─── permissive preset specifics ─────────────────────────────────────────────

describe('permissive preset', () => {
  const perm = PRESETS.permissive;

  it('should have bash as object with "*": "allow"', () => {
    assert.equal(typeof perm.bash, 'object');
    const bash = /** @type {Record<string, string>} */ (perm.bash);
    assert.equal(bash['*'], 'allow');
  });

  it('should have all flat permissions as allow', () => {
    for (const [key, value] of Object.entries(perm)) {
      if (typeof value === 'string') {
        assert.equal(value, 'allow', `permissive.${key} should be "allow"`);
      }
    }
  });
});

// ─── yolo preset specifics ───────────────────────────────────────────────────

describe('yolo preset', () => {
  const yolo = PRESETS.yolo;

  it('should have all 17 permissions effectively as allow', () => {
    for (const [key, value] of Object.entries(yolo)) {
      if (typeof value === 'string') {
        assert.equal(value, 'allow', `yolo.${key} should be "allow"`);
      } else {
        // Object values: all sub-values should be allow
        for (const [pattern, action] of Object.entries(value)) {
          assert.equal(action, 'allow', `yolo.${key}["${pattern}"] should be "allow"`);
        }
      }
    }
  });
});

// ─── getPreset ───────────────────────────────────────────────────────────────

describe('getPreset', () => {
  it('should return a valid preset for each known name', () => {
    for (const name of PRESET_NAMES) {
      const preset = getPreset(name);
      assert.equal(Object.keys(preset).length, 17);
    }
  });

  it('should return a copy — modifying it does not affect the original', () => {
    const copy = getPreset('strict');
    copy.read = 'deny';
    assert.equal(PRESETS.strict.read, 'allow', 'original should be unchanged');
  });

  it('should throw for unknown preset name', () => {
    assert.throws(() => getPreset('unknown'), /Unknown preset/);
  });

  it('should throw for empty string', () => {
    assert.throws(() => getPreset(''), /Unknown preset/);
  });
});

// ─── isValidAction ───────────────────────────────────────────────────────────

describe('isValidAction', () => {
  it('should return true for "allow"', () => {
    assert.equal(isValidAction('allow'), true);
  });

  it('should return true for "ask"', () => {
    assert.equal(isValidAction('ask'), true);
  });

  it('should return true for "deny"', () => {
    assert.equal(isValidAction('deny'), true);
  });

  it('should return false for "foo"', () => {
    assert.equal(isValidAction('foo'), false);
  });

  it('should return false for empty string', () => {
    assert.equal(isValidAction(''), false);
  });

  it('should return false for "ALLOW" (case-sensitive)', () => {
    assert.equal(isValidAction('ALLOW'), false);
  });
});

// ─── isValidPermission ───────────────────────────────────────────────────────

describe('isValidPermission', () => {
  it('should return true for "bash"', () => {
    assert.equal(isValidPermission('bash'), true);
  });

  it('should return true for "browsermcp"', () => {
    assert.equal(isValidPermission('browsermcp'), true);
  });

  it('should return false for "foo"', () => {
    assert.equal(isValidPermission('foo'), false);
  });

  it('should return false for empty string', () => {
    assert.equal(isValidPermission(''), false);
  });

  it('should return false for "BASH" (case-sensitive)', () => {
    assert.equal(isValidPermission('BASH'), false);
  });
});
