import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

import {
  loadPreferences,
  savePreferences,
  getPreferencesPath,
  clearPreferences,
} from '../src/permissions/persistence.mjs';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir() {
  const dir = join(tmpdir(), `opencode-perm-test-${randomBytes(6).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// ── persistence tests ────────────────────────────────────────────────────────

describe('permissions persistence', () => {
  let tmpDir;
  let origXDG;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    origXDG = process.env.XDG_CONFIG_HOME;
    process.env.XDG_CONFIG_HOME = tmpDir;
  });

  afterEach(() => {
    if (origXDG === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = origXDG;
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('save + load round-trip', () => {
    const prefs = {
      preset: 'balanced',
      overrides: [{ agent: null, permission: 'bash', action: 'allow' }],
    };
    savePreferences(prefs);
    const loaded = loadPreferences();
    assert.notEqual(loaded, null);
    assert.equal(loaded.preset, 'balanced');
    assert.equal(loaded.overrides.length, 1);
    assert.deepEqual(loaded.overrides[0], {
      agent: null,
      permission: 'bash',
      action: 'allow',
    });
  });

  it('load when no file exists → null', () => {
    const loaded = loadPreferences();
    assert.equal(loaded, null);
  });

  it('load corrupted JSON → null + stderr warning', (t) => {
    const filePath = getPreferencesPath();
    const dir = join(filePath, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, '{not valid json!!!', 'utf-8');

    // Capture stderr
    const origWrite = process.stderr.write;
    let stderrOutput = '';
    process.stderr.write = (chunk) => {
      stderrOutput += chunk;
      return true;
    };

    const loaded = loadPreferences();

    process.stderr.write = origWrite;

    assert.equal(loaded, null);
    assert.ok(stderrOutput.includes('invalid JSON'), `expected warning, got: ${stderrOutput}`);
  });

  it('save with yolo preset → throws', () => {
    assert.throws(
      () => savePreferences({ preset: 'yolo' }),
      /YOLO preset cannot be saved/,
    );
  });

  it('load with yolo preset in file → null (filtered out)', (t) => {
    const filePath = getPreferencesPath();
    const dir = join(filePath, '..');
    mkdirSync(dir, { recursive: true });
    writeFileSync(filePath, JSON.stringify({ version: 1, preset: 'yolo' }), 'utf-8');

    // Suppress stderr warning
    const origWrite = process.stderr.write;
    process.stderr.write = () => true;

    const loaded = loadPreferences();

    process.stderr.write = origWrite;

    assert.equal(loaded, null);
  });

  it('file created with 0o600 permissions', () => {
    savePreferences({ preset: 'strict' });
    const filePath = getPreferencesPath();
    const stat = statSync(filePath);
    // 0o600 = 0o100600 on files, check lower bits
    const mode = stat.mode & 0o777;
    assert.equal(mode, 0o600, `expected 0o600, got 0o${mode.toString(8)}`);
  });

  it('clearPreferences removes the file', () => {
    savePreferences({ preset: 'strict' });
    const filePath = getPreferencesPath();
    assert.ok(existsSync(filePath), 'file should exist before clear');
    clearPreferences();
    assert.ok(!existsSync(filePath), 'file should not exist after clear');
  });

  it('clearPreferences when no file → no error', () => {
    assert.doesNotThrow(() => clearPreferences());
  });

  it('save creates directory if not exists', () => {
    // XDG_CONFIG_HOME points to tmpDir, but opencode subdir doesn't exist yet
    // (beforeEach only creates tmpDir, not tmpDir/opencode)
    const filePath = getPreferencesPath();
    const dir = join(filePath, '..');
    assert.ok(!existsSync(dir), 'opencode dir should not exist yet');

    savePreferences({ preset: 'strict' });

    assert.ok(existsSync(filePath), 'file should exist after save');
  });
});
