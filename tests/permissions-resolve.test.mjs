import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolvePermissions } from '../src/permissions/resolve.mjs';
import { getPreset, PRESETS } from '../src/permissions/presets.mjs';

// ── resolvePermissions ───────────────────────────────────────────────────────

describe('resolvePermissions', () => {
  it('no options → returns null', () => {
    const result = resolvePermissions();
    assert.equal(result, null);
  });

  it('CLI preset → returns that preset permissions', () => {
    const result = resolvePermissions({ cliPreset: 'strict' });
    assert.equal(result.bash, 'deny');
    assert.equal(result.read, 'allow');
    assert.equal(Object.keys(result).length, 17);
  });

  it('--yolo → returns yolo permissions', () => {
    const result = resolvePermissions({ cliYolo: true });
    // All flat values should be allow
    for (const [key, value] of Object.entries(result)) {
      if (typeof value === 'string') {
        assert.equal(value, 'allow', `yolo.${key} should be "allow"`);
      }
    }
  });

  it('--yolo + --permissions balanced → yolo wins', () => {
    const result = resolvePermissions({
      cliPreset: 'balanced',
      cliYolo: true,
    });
    // yolo has mcp=allow, balanced has mcp=ask
    assert.equal(result.mcp, 'allow');
  });

  it('saved preferences with preset → returns that preset', () => {
    const result = resolvePermissions({
      savedPreferences: { preset: 'strict' },
    });
    assert.equal(result.bash, 'deny');
    assert.equal(result.write, 'deny');
  });

  it('CLI preset overrides saved preset', () => {
    const result = resolvePermissions({
      savedPreferences: { preset: 'strict' },
      cliPreset: 'permissive',
    });
    // permissive has mcp=allow, strict has mcp=deny
    assert.equal(result.mcp, 'allow');
  });

  it('CLI overrides applied on top of preset', () => {
    const result = resolvePermissions({
      cliPreset: 'strict',
      cliOverrides: [{ agent: null, permission: 'bash', action: 'allow' }],
    });
    // strict has bash=deny, override sets bash=allow
    assert.equal(result.bash, 'allow');
    // other strict values should be preserved
    assert.equal(result.write, 'deny');
  });

  it('agent-scoped override only applies to matching agent', () => {
    const result = resolvePermissions({
      cliPreset: 'strict',
      cliOverrides: [{ agent: 'other-agent', permission: 'bash', action: 'allow' }],
      agentName: 'my-agent',
    });
    // override targets other-agent, so my-agent keeps strict bash=deny
    assert.equal(result.bash, 'deny');
  });

  it('override bash=allow replaces bash pattern map with flat string', () => {
    const result = resolvePermissions({
      cliPreset: 'balanced',
      cliOverrides: [{ agent: null, permission: 'bash', action: 'allow' }],
    });
    // balanced has bash as an object, override should replace it with string
    assert.equal(result.bash, 'allow');
    assert.equal(typeof result.bash, 'string');
  });

  it('built-in parameter is not used in resolution when no other layers', () => {
    const builtIn = { read: 'deny', write: 'deny', bash: 'deny' };
    const result = resolvePermissions({ builtIn });
    assert.equal(result, null);
  });
});
