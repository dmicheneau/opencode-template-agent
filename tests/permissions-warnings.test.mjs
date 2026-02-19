import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  WarningLevel,
  displayWarning,
  getWarningsForPreset,
  getWarningsForPermission,
} from '../src/permissions/warnings.mjs';

// ─── WarningLevel ────────────────────────────────────────────────────────────

describe('WarningLevel', () => {
  it('should have CRITICAL, HIGH, MEDIUM, INFO', () => {
    assert.equal(WarningLevel.CRITICAL, 'critical');
    assert.equal(WarningLevel.HIGH, 'high');
    assert.equal(WarningLevel.MEDIUM, 'medium');
    assert.equal(WarningLevel.INFO, 'info');
  });

  it('should be frozen', () => {
    assert.ok(Object.isFrozen(WarningLevel));
    assert.throws(() => {
      'use strict';
      /** @type {any} */ (WarningLevel).LOW = 'low';
    }, TypeError);
  });
});

// ─── getWarningsForPreset ────────────────────────────────────────────────────

describe('getWarningsForPreset', () => {
  it('"yolo" should return a CRITICAL level warning', () => {
    const warnings = getWarningsForPreset('yolo');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.CRITICAL);
  });

  it('"permissive" should return a HIGH level warning', () => {
    const warnings = getWarningsForPreset('permissive');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.HIGH);
  });

  it('"balanced" should return an INFO level warning', () => {
    const warnings = getWarningsForPreset('balanced');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.INFO);
  });

  it('"strict" should return an INFO level warning', () => {
    const warnings = getWarningsForPreset('strict');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.INFO);
  });

  it('"unknown" should return empty array', () => {
    const warnings = getWarningsForPreset('unknown');
    assert.deepEqual(warnings, []);
  });

  it('empty string should return empty array', () => {
    const warnings = getWarningsForPreset('');
    assert.deepEqual(warnings, []);
  });

  it('each warning should have level, title, and message', () => {
    for (const preset of ['yolo', 'permissive', 'balanced', 'strict']) {
      const warnings = getWarningsForPreset(preset);
      for (const w of warnings) {
        assert.ok(typeof w.level === 'string', `${preset} warning missing level`);
        assert.ok(typeof w.title === 'string', `${preset} warning missing title`);
        assert.ok(typeof w.message === 'string', `${preset} warning missing message`);
      }
    }
  });
});

// ─── getWarningsForPermission ────────────────────────────────────────────────

describe('getWarningsForPermission', () => {
  it('"bash" + "allow" should return a MEDIUM warning', () => {
    const warnings = getWarningsForPermission('bash', 'allow');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.MEDIUM);
  });

  it('"write" + "allow" should return a MEDIUM warning', () => {
    const warnings = getWarningsForPermission('write', 'allow');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.MEDIUM);
  });

  it('"mcp" + "allow" should return a MEDIUM warning', () => {
    const warnings = getWarningsForPermission('mcp', 'allow');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.MEDIUM);
  });

  it('"browsermcp" + "allow" should return a MEDIUM warning', () => {
    const warnings = getWarningsForPermission('browsermcp', 'allow');
    assert.ok(warnings.length > 0);
    assert.equal(warnings[0].level, WarningLevel.MEDIUM);
  });

  it('"read" + "allow" should return empty (not dangerous)', () => {
    const warnings = getWarningsForPermission('read', 'allow');
    assert.deepEqual(warnings, []);
  });

  it('"bash" + "deny" should return empty (deny is safe)', () => {
    const warnings = getWarningsForPermission('bash', 'deny');
    assert.deepEqual(warnings, []);
  });

  it('"bash" + "ask" should return empty', () => {
    const warnings = getWarningsForPermission('bash', 'ask');
    assert.deepEqual(warnings, []);
  });

  it('unknown permission should return empty', () => {
    const warnings = getWarningsForPermission('nonexistent', 'allow');
    assert.deepEqual(warnings, []);
  });
});

// ─── displayWarning ──────────────────────────────────────────────────────────

describe('displayWarning', () => {
  /**
   * Create a mock writable stream that captures output.
   * @returns {{ stream: { write: Function, columns?: number }, output: string[] }}
   */
  function mockStream() {
    /** @type {string[]} */
    const output = [];
    const stream = {
      write(/** @type {string} */ chunk) {
        output.push(String(chunk));
        return true;
      },
      columns: 80,
    };
    return { stream, output };
  }

  it('should write to the provided stream', () => {
    const { stream, output } = mockStream();
    displayWarning(WarningLevel.INFO, 'Test Title', 'Test message body', /** @type {any} */ (stream));
    assert.ok(output.length > 0, 'should have written to the stream');
  });

  it('output should contain the title text', () => {
    const { stream, output } = mockStream();
    displayWarning(WarningLevel.CRITICAL, 'Danger Zone', 'Be careful.', /** @type {any} */ (stream));
    const full = output.join('');
    assert.ok(full.includes('Danger Zone'), 'output should contain the title');
  });

  it('output should contain the level text (uppercased)', () => {
    const { stream, output } = mockStream();
    displayWarning(WarningLevel.HIGH, 'Some Title', 'Some message.', /** @type {any} */ (stream));
    const full = output.join('');
    assert.ok(full.includes('HIGH'), 'output should contain the level text');
  });

  it('output should contain the message body', () => {
    const { stream, output } = mockStream();
    displayWarning(WarningLevel.MEDIUM, 'Title', 'This is the message body text.', /** @type {any} */ (stream));
    const full = output.join('');
    assert.ok(full.includes('message body text'), 'output should contain the message');
  });

  it('should produce box-drawing characters', () => {
    const { stream, output } = mockStream();
    displayWarning(WarningLevel.INFO, 'Box Test', 'Box chars.', /** @type {any} */ (stream));
    const full = output.join('');
    // Should contain box drawing characters (┌, ┐, └, ┘, │, ─)
    assert.ok(full.includes('┌') || full.includes('─') || full.includes('│'),
      'output should contain box-drawing characters');
  });

  it('should work for all 4 warning levels', () => {
    for (const level of [WarningLevel.CRITICAL, WarningLevel.HIGH, WarningLevel.MEDIUM, WarningLevel.INFO]) {
      const { stream, output } = mockStream();
      displayWarning(level, `${level} title`, `${level} message`, /** @type {any} */ (stream));
      assert.ok(output.length > 0, `should produce output for level ${level}`);
      const full = output.join('');
      assert.ok(full.includes(level.toUpperCase()), `output should contain "${level.toUpperCase()}"`);
    }
  });
});
