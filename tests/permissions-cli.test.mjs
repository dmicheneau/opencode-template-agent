import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePermissionFlags,
  parseOverrideSpec,
} from '../src/permissions/cli.mjs';

// ── parsePermissionFlags ─────────────────────────────────────────────────────

describe('parsePermissionFlags', () => {
  it('no permission flags → all defaults', () => {
    const result = parsePermissionFlags([]);
    assert.equal(result.preset, null);
    assert.equal(result.yolo, false);
    assert.deepEqual(result.overrides, []);
    assert.equal(result.savePermissions, false);
    assert.equal(result.noSavedPermissions, false);
    assert.equal(result.noInteractive, false);
  });

  it('--yolo → yolo: true', () => {
    const result = parsePermissionFlags(['--yolo']);
    assert.equal(result.yolo, true);
  });

  it('--permissions balanced → preset: "balanced"', () => {
    const result = parsePermissionFlags(['--permissions', 'balanced']);
    assert.equal(result.preset, 'balanced');
  });

  it('--permissions invalid → throws', () => {
    assert.throws(
      () => parsePermissionFlags(['--permissions', 'invalid']),
      /Unknown preset "invalid"/,
    );
  });

  it('--permission-override bash=allow → override parsed', () => {
    const result = parsePermissionFlags(['--permission-override', 'bash=allow']);
    assert.equal(result.overrides.length, 1);
    assert.deepEqual(result.overrides[0], {
      agent: null,
      permission: 'bash',
      action: 'allow',
    });
  });

  it('multiple --permission-override flags → multiple overrides', () => {
    const result = parsePermissionFlags([
      '--permission-override', 'bash=allow',
      '--permission-override', 'write=deny',
    ]);
    assert.equal(result.overrides.length, 2);
    assert.equal(result.overrides[0].permission, 'bash');
    assert.equal(result.overrides[1].permission, 'write');
  });

  it('--save-permissions → savePermissions: true', () => {
    const result = parsePermissionFlags(['--save-permissions']);
    assert.equal(result.savePermissions, true);
  });

  it('--no-saved-permissions → noSavedPermissions: true', () => {
    const result = parsePermissionFlags(['--no-saved-permissions']);
    assert.equal(result.noSavedPermissions, true);
  });

  it('--no-interactive → noInteractive: true', () => {
    const result = parsePermissionFlags(['--no-interactive']);
    assert.equal(result.noInteractive, true);
  });
});

// ── parseOverrideSpec ────────────────────────────────────────────────────────

describe('parseOverrideSpec', () => {
  it('bash=allow → { agent: null, permission: "bash", action: "allow" }', () => {
    const result = parseOverrideSpec('bash=allow');
    assert.deepEqual(result, { agent: null, permission: 'bash', action: 'allow' });
  });

  it('my-agent:write=deny → { agent: "my-agent", permission: "write", action: "deny" }', () => {
    const result = parseOverrideSpec('my-agent:write=deny');
    assert.deepEqual(result, { agent: 'my-agent', permission: 'write', action: 'deny' });
  });

  it('invalid (no =) → throws', () => {
    assert.throws(
      () => parseOverrideSpec('invalid'),
      /Invalid override spec/,
    );
  });

  it('foo=allow (invalid permission) → throws', () => {
    assert.throws(
      () => parseOverrideSpec('foo=allow'),
      /Unknown permission "foo"/,
    );
  });

  it('bash=invalid (invalid action) → throws', () => {
    assert.throws(
      () => parseOverrideSpec('bash=invalid'),
      /Invalid action "invalid"/,
    );
  });
});
