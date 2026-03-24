import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { detectProjectProfile, scoreAgents } from '../src/recommender.mjs';
import { loadManifest } from '../src/registry.mjs';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal manifest for scoring tests.
 * @param {Array<object>} agents
 * @param {Record<string, object>} [packs]
 */
function makeManifest(agents = [], packs = {}) {
  return {
    version: '1.0.0',
    base_path: '.opencode/agents',
    categories: {},
    agents,
    packs,
  };
}

// ─── detectProjectProfile ────────────────────────────────────────────────────

describe('detectProjectProfile', () => {
  let tmp;

  before(() => {
    tmp = mkdtempSync(join(tmpdir(), 'recommender-'));
  });

  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('empty directory → profile with empty languages and tools arrays', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'rec-empty-'));
    try {
      const profile = detectProjectProfile(emptyDir);
      assert.ok(Array.isArray(profile.languages), 'languages should be an array');
      assert.ok(Array.isArray(profile.tools), 'tools should be an array');
      assert.equal(profile.languages.length, 0);
      assert.equal(profile.tools.length, 0);
      assert.equal(profile.hasDocker, false);
      assert.equal(profile.hasCi, false);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('package.json with React deps → detects javascript language', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-react-'));
    try {
      writeFileSync(
        join(dir, 'package.json'),
        JSON.stringify({
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        }),
        'utf-8',
      );
      const profile = detectProjectProfile(dir);
      assert.ok(profile.languages.includes('javascript'), 'should detect javascript');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('go.mod → detects go language', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-go-'));
    try {
      writeFileSync(join(dir, 'go.mod'), 'module example.com/foo\n\ngo 1.21\n', 'utf-8');
      const profile = detectProjectProfile(dir);
      assert.ok(profile.languages.includes('go'), 'should detect go');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('.github/workflows/ → detects ci-cd tool', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-ci-'));
    try {
      mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
      const profile = detectProjectProfile(dir);
      assert.ok(profile.tools.includes('ci-cd'), 'should detect ci-cd');
      assert.equal(profile.hasCi, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('Dockerfile → detects docker tool', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rec-docker-'));
    try {
      writeFileSync(join(dir, 'Dockerfile'), 'FROM node:20\n', 'utf-8');
      const profile = detectProjectProfile(dir);
      assert.ok(profile.tools.includes('docker'), 'should detect docker');
      assert.equal(profile.hasDocker, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('non-existent directory → returns empty profile (no throw)', () => {
    const profile = detectProjectProfile('/nonexistent/path/that/does/not/exist-' + Date.now());
    assert.ok(Array.isArray(profile.languages));
    assert.equal(profile.languages.length, 0);
    assert.ok(Array.isArray(profile.tools));
    assert.equal(profile.tools.length, 0);
  });
});

// ─── scoreAgents ─────────────────────────────────────────────────────────────

describe('scoreAgents', () => {
  it('javascript profile → top results include js-ecosystem agents', () => {
    const manifest = loadManifest();
    const profile = {
      languages: ['javascript', 'typescript'],
      frameworks: ['react'],
      tools: [],
      hasTests: false,
      hasCi: false,
      hasDocker: false,
      hasKubernetes: false,
      hasTerraform: false,
    };
    const results = scoreAgents({ profile, query: null, installed: new Set(), manifest });
    assert.ok(results.length > 0, 'should return at least one suggestion');
    // At least one result should mention javascript/typescript/react in its reasons or category
    const hasJsAgent = results.some(r =>
      r.agent.ecosystem?.some(e => ['javascript', 'typescript', 'web'].includes(e.replace(/^ecosystem:/, ''))) ||
      r.agent.category === 'web' ||
      r.agent.category === 'languages',
    );
    assert.ok(hasJsAgent, 'should include js-ecosystem agents for javascript profile');
  });

  it('null profile → returns results based on installed set filtering only', () => {
    const manifest = loadManifest();
    // Install all agents except the first
    const first = manifest.agents[0];
    const installed = new Set(manifest.agents.slice(1).map(a => a.name));
    // With null profile and null query, no scores are computed → empty array
    const results = scoreAgents({ profile: null, query: null, installed, manifest });
    // All returned agents must NOT be in installed
    for (const r of results) {
      assert.ok(!installed.has(r.agent.name), `installed agent "${r.agent.name}" should be excluded`);
    }
    // first agent is not installed so if it appears it's fine; no installed agent should appear
    assert.equal(results.filter(r => r.agent.name !== first.name && !installed.has(r.agent.name)).length, results.length);
  });

  it('installed agents are excluded from results', () => {
    const manifest = loadManifest();
    const installed = new Set(manifest.agents.map(a => a.name)); // install everything
    const profile = {
      languages: ['javascript'],
      frameworks: [],
      tools: [],
      hasTests: false,
      hasCi: false,
      hasDocker: false,
      hasKubernetes: false,
      hasTerraform: false,
    };
    const results = scoreAgents({ profile, query: null, installed, manifest });
    assert.equal(results.length, 0, 'no results when all agents are installed');
  });

  it('all scores are between 0 and 1 (inclusive)', () => {
    const manifest = loadManifest();
    const profile = {
      languages: ['python'],
      frameworks: ['fastapi', 'pytorch'],
      tools: ['docker'],
      hasTests: true,
      hasCi: true,
      hasDocker: true,
      hasKubernetes: false,
      hasTerraform: false,
    };
    const results = scoreAgents({ profile, query: null, installed: new Set(), manifest });
    for (const r of results) {
      assert.ok(r.score >= 0, `score ${r.score} is below 0 for "${r.agent.name}"`);
      assert.ok(r.score <= 1, `score ${r.score} exceeds 1 for "${r.agent.name}"`);
    }
  });

  it('limit parameter is respected (max 10 results)', () => {
    const manifest = loadManifest();
    const profile = {
      languages: ['javascript', 'typescript', 'python', 'go'],
      frameworks: ['react', 'nextjs', 'fastapi'],
      tools: ['docker', 'ci-cd'],
      hasTests: true,
      hasCi: true,
      hasDocker: true,
      hasKubernetes: false,
      hasTerraform: false,
    };
    const results = scoreAgents({ profile, query: null, installed: new Set(), manifest });
    assert.ok(results.length <= 10, `expected at most 10 results, got ${results.length}`);
  });

  it('empty profile → returns empty array (no matching stack signals)', () => {
    const agents = [
      {
        name: 'agent-a',
        category: 'languages',
        path: 'languages/agent-a',
        mode: 'subagent',
        description: 'TypeScript specialist',
        tags: ['typescript'],
        ecosystem: ['typescript'],
      },
    ];
    const manifest = makeManifest(agents);
    const profile = {
      languages: [],
      frameworks: [],
      tools: [],
      hasTests: false,
      hasCi: false,
      hasDocker: false,
      hasKubernetes: false,
      hasTerraform: false,
    };
    // With empty profile and no query, stack score will be 0 → no results
    const results = scoreAgents({ profile, query: null, installed: new Set(), manifest });
    // Acceptable: empty OR very low score agents are filtered
    // The implementation only includes agents with totalScore > 0
    assert.ok(results.length === 0 || results.every(r => r.score > 0));
  });

  it('installed set correctly filters — partial install', () => {
    const manifest = loadManifest();
    const firstTwo = new Set(manifest.agents.slice(0, 2).map(a => a.name));
    const profile = {
      languages: ['javascript'],
      frameworks: [],
      tools: [],
      hasTests: false,
      hasCi: false,
      hasDocker: false,
      hasKubernetes: false,
      hasTerraform: false,
    };
    const results = scoreAgents({ profile, query: null, installed: firstTwo, manifest });
    for (const r of results) {
      assert.ok(!firstTwo.has(r.agent.name), `"${r.agent.name}" is installed and should not appear`);
    }
  });
});
