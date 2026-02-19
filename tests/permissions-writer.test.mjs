import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  readFrontmatterBoundaries,
  buildPermissionYaml,
  spliceFrontmatter,
  applyPermissions,
} from '../src/permissions/writer.mjs';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SAMPLE_FM = `---
description: >
  Test agent for unit tests
mode: subagent
permission:
  write: allow
  edit: ask
  bash:
    "*": ask
    "git status*": allow
  task:
    "*": allow
color: accent
---

# Agent body content
`;

const SAMPLE_FM_NO_PERMS = `---
description: >
  Test agent for unit tests
mode: subagent
color: accent
---

# Agent body content
`;

const EMPTY_FM = `---
---

Body after empty frontmatter.
`;

const BOM_FM = `\uFEFF---
description: BOM test
permission:
  read: allow
---

# BOM body
`;

const CRLF_FM = '---\r\ndescription: CRLF test\r\npermission:\r\n  read: allow\r\n  write: deny\r\n---\r\n\r\n# CRLF body\r\n';

const FM_ONLY = `---
description: No body after frontmatter
permission:
  read: allow
---`;

const PERM_AT_END = `---
description: Perm at end
mode: subagent
permission:
  read: allow
  write: deny
---

# Body
`;

const UNUSUAL_INDENT = `---
description: Weird indent
permission:
    read: allow
      write: deny
  edit: ask
---

# Body
`;

// ─── readFrontmatterBoundaries ───────────────────────────────────────────────

describe('readFrontmatterBoundaries', () => {
  it('should find boundaries in standard frontmatter', () => {
    const result = readFrontmatterBoundaries(SAMPLE_FM);
    assert.ok(result !== null);
    assert.ok(result.body.includes('description:'));
    assert.ok(result.body.includes('permission:'));
    assert.ok(result.body.includes('color:'));
    assert.ok(result.start < result.end);
  });

  it('should return null for content without frontmatter', () => {
    const result = readFrontmatterBoundaries('# Just a markdown file\n\nNo frontmatter here.\n');
    assert.equal(result, null);
  });

  it('should return null for content starting with text', () => {
    const result = readFrontmatterBoundaries('Hello world\n---\nfoo: bar\n---\n');
    assert.equal(result, null);
  });

  it('should handle BOM prefix', () => {
    const result = readFrontmatterBoundaries(BOM_FM);
    assert.ok(result !== null);
    assert.ok(result.body.includes('description: BOM test'));
    assert.ok(result.body.includes('permission:'));
  });

  it('should handle CRLF line endings', () => {
    const result = readFrontmatterBoundaries(CRLF_FM);
    assert.ok(result !== null);
    assert.ok(result.body.includes('description: CRLF test'));
    assert.ok(result.body.includes('permission:'));
  });

  it('should handle empty frontmatter', () => {
    const result = readFrontmatterBoundaries(EMPTY_FM);
    assert.ok(result !== null);
    assert.equal(result.body.trim(), '');
  });

  it('should handle frontmatter with no body after', () => {
    const result = readFrontmatterBoundaries(FM_ONLY);
    assert.ok(result !== null);
    assert.ok(result.body.includes('description:'));
  });

  it('should return null for incomplete frontmatter (no closing ---)', () => {
    const result = readFrontmatterBoundaries('---\nfoo: bar\n');
    assert.equal(result, null);
  });
});

// ─── buildPermissionYaml ─────────────────────────────────────────────────────

describe('buildPermissionYaml', () => {
  it('should produce correct YAML for simple string permissions', () => {
    const yaml = buildPermissionYaml({ read: 'allow', write: 'deny', edit: 'ask' });
    assert.ok(yaml.startsWith('permission:\n'));
    assert.ok(yaml.includes('  read: allow\n'));
    assert.ok(yaml.includes('  write: deny\n'));
    assert.ok(yaml.includes('  edit: ask\n'));
  });

  it('should produce correct YAML for mixed permissions (bash as object)', () => {
    const yaml = buildPermissionYaml({
      read: 'allow',
      bash: { '*': 'ask', 'git status*': 'allow' },
    });
    assert.ok(yaml.includes('  read: allow\n'));
    assert.ok(yaml.includes('  bash:\n'));
    assert.ok(yaml.includes('    "*": ask\n'));
    assert.ok(yaml.includes('    "git status*": allow\n'));
  });

  it('should quote pattern keys with *', () => {
    const yaml = buildPermissionYaml({
      bash: { '*': 'ask' },
    });
    assert.ok(yaml.includes('"*"'));
  });

  it('should quote pattern keys with spaces', () => {
    const yaml = buildPermissionYaml({
      bash: { 'git log --oneline': 'allow' },
    });
    assert.ok(yaml.includes('"git log --oneline"'));
  });

  it('should not quote simple keys without * or spaces', () => {
    const yaml = buildPermissionYaml({
      bash: { git: 'allow' },
    });
    assert.ok(yaml.includes('    git: allow'));
    assert.ok(!yaml.includes('"git"'));
  });

  it('should produce a trailing newline', () => {
    const yaml = buildPermissionYaml({ read: 'allow' });
    assert.ok(yaml.endsWith('\n'));
  });
});

// ─── spliceFrontmatter ──────────────────────────────────────────────────────

describe('spliceFrontmatter', () => {
  it('should replace existing permission block', () => {
    const newYaml = buildPermissionYaml({ read: 'deny', write: 'allow' });
    const result = spliceFrontmatter(SAMPLE_FM, newYaml);

    assert.ok(result.includes('read: deny'));
    assert.ok(result.includes('write: allow'));
    // Old permission values should be gone
    assert.ok(!result.includes('edit: ask'));
    assert.ok(!result.includes('"git status*": allow'));
  });

  it('should preserve non-permission content', () => {
    const newYaml = buildPermissionYaml({ read: 'deny' });
    const result = spliceFrontmatter(SAMPLE_FM, newYaml);

    assert.ok(result.includes('description:'));
    assert.ok(result.includes('Test agent for unit tests'));
    assert.ok(result.includes('mode: subagent'));
    assert.ok(result.includes('color: accent'));
    assert.ok(result.includes('# Agent body content'));
  });

  it('should append permission block if none exists', () => {
    const newYaml = buildPermissionYaml({ read: 'allow', write: 'deny' });
    const result = spliceFrontmatter(SAMPLE_FM_NO_PERMS, newYaml);

    assert.ok(result.includes('permission:\n'));
    assert.ok(result.includes('  read: allow'));
    assert.ok(result.includes('  write: deny'));
    // Other content preserved
    assert.ok(result.includes('description:'));
    assert.ok(result.includes('mode: subagent'));
    assert.ok(result.includes('color: accent'));
  });

  it('should return content unchanged if no frontmatter', () => {
    const noFm = '# Just a file\n\nNo frontmatter.\n';
    const result = spliceFrontmatter(noFm, buildPermissionYaml({ read: 'allow' }));
    assert.equal(result, noFm);
  });

  it('should handle permission block at end of frontmatter', () => {
    const newYaml = buildPermissionYaml({ read: 'deny' });
    const result = spliceFrontmatter(PERM_AT_END, newYaml);

    assert.ok(result.includes('read: deny'));
    assert.ok(!result.includes('write: deny'));
    assert.ok(result.includes('description: Perm at end'));
    assert.ok(result.includes('mode: subagent'));
    assert.ok(result.includes('# Body'));
  });

  it('should replace permission block with unusual indentation entirely', () => {
    const newYaml = buildPermissionYaml({ read: 'allow', write: 'allow', edit: 'allow' });
    const result = spliceFrontmatter(UNUSUAL_INDENT, newYaml);

    // The new block should be clean
    assert.ok(result.includes('  read: allow'));
    assert.ok(result.includes('  write: allow'));
    assert.ok(result.includes('  edit: allow'));
    assert.ok(result.includes('description: Weird indent'));
  });
});

// ─── applyPermissions ────────────────────────────────────────────────────────

describe('applyPermissions', () => {
  it('should round-trip: apply then re-read boundaries and find new permissions', () => {
    const permissions = {
      read: 'allow',
      write: 'allow',
      edit: 'allow',
      bash: { '*': 'ask', 'git status*': 'allow', 'git diff*': 'allow', 'git log*': 'allow' },
      glob: 'allow',
      grep: 'allow',
      webfetch: 'allow',
      task: { '*': 'allow' },
      mcp: 'ask',
      todoread: 'allow',
      todowrite: 'allow',
      distill: 'allow',
      prune: 'allow',
      sequentialthinking: 'allow',
      memory: 'allow',
      browsermcp: 'ask',
      skill: 'allow',
    };

    const result = applyPermissions(SAMPLE_FM, permissions);
    const bounds = readFrontmatterBoundaries(result);
    assert.ok(bounds !== null);

    // Verify all permissions are in the new frontmatter
    assert.ok(bounds.body.includes('mcp: ask'));
    assert.ok(bounds.body.includes('browsermcp: ask'));
    assert.ok(bounds.body.includes('glob: allow'));
    assert.ok(bounds.body.includes('"git diff*": allow'));
  });

  it('round-trip: rest of frontmatter should be unchanged', () => {
    const permissions = { read: 'deny', write: 'deny' };
    const result = applyPermissions(SAMPLE_FM, permissions);

    assert.ok(result.includes('description:'));
    assert.ok(result.includes('Test agent for unit tests'));
    assert.ok(result.includes('mode: subagent'));
    assert.ok(result.includes('color: accent'));
    assert.ok(result.includes('# Agent body content'));
  });
});

// ─── S4.7: Edge cases ────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('no permission block in frontmatter → applyPermissions adds it', () => {
    const result = applyPermissions(SAMPLE_FM_NO_PERMS, { read: 'allow', write: 'deny' });
    assert.ok(result.includes('permission:\n'));
    assert.ok(result.includes('  read: allow'));
    assert.ok(result.includes('  write: deny'));
    // Still valid frontmatter
    const bounds = readFrontmatterBoundaries(result);
    assert.ok(bounds !== null);
  });

  it('empty frontmatter → applyPermissions adds permission block', () => {
    const result = applyPermissions(EMPTY_FM, { read: 'allow' });
    assert.ok(result.includes('permission:\n'));
    assert.ok(result.includes('  read: allow'));
    // Body still present
    assert.ok(result.includes('Body after empty frontmatter.'));
  });

  it('CRLF line endings → correct splicing', () => {
    const result = applyPermissions(CRLF_FM, { read: 'deny', write: 'allow' });
    assert.ok(result.includes('read: deny'));
    assert.ok(result.includes('write: allow'));
    // Old permission values gone
    assert.ok(!result.includes('read: allow'));
    // Body preserved
    assert.ok(result.includes('# CRLF body'));
  });

  it('UTF-8 BOM → correct boundary detection and splicing', () => {
    const result = applyPermissions(BOM_FM, { read: 'deny', write: 'allow' });
    assert.ok(result.includes('read: deny'));
    assert.ok(result.includes('write: allow'));
    assert.ok(result.startsWith('\uFEFF'));
    assert.ok(result.includes('description: BOM test'));
  });

  it('file with only frontmatter (no body after) → works correctly', () => {
    const result = applyPermissions(FM_ONLY, { read: 'deny', write: 'allow' });
    assert.ok(result.includes('read: deny'));
    assert.ok(result.includes('write: allow'));
    assert.ok(result.includes('description: No body after frontmatter'));
    // Should still have valid frontmatter markers
    const bounds = readFrontmatterBoundaries(result);
    assert.ok(bounds !== null);
  });

  it('permission block at end of frontmatter → replaced correctly', () => {
    const result = applyPermissions(PERM_AT_END, { bash: { '*': 'deny' } });
    assert.ok(result.includes('"*": deny'));
    assert.ok(!result.includes('read: allow'));
    assert.ok(!result.includes('write: deny'));
    assert.ok(result.includes('description: Perm at end'));
    assert.ok(result.includes('mode: subagent'));
  });

  it('permission block with unusual indentation → replaced entirely', () => {
    const result = applyPermissions(UNUSUAL_INDENT, { read: 'deny' });
    assert.ok(result.includes('  read: deny'));
    assert.ok(result.includes('description: Weird indent'));
    // Old weird-indent values gone
    const bounds = readFrontmatterBoundaries(result);
    assert.ok(bounds !== null);
    // Should not contain old indented values
    assert.ok(!bounds.body.includes('      write: deny'));
  });
});
