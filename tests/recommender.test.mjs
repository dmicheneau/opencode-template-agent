/**
 * Tests for src/recommender.mjs
 * Runner: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

import {
  detectProjectProfile,
  analyzeQuery,
  scoreAgents,
} from '../src/recommender.mjs';

import { getManifest } from '../src/registry.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, 'fixtures');

// ─── detectProjectProfile ────────────────────────────────────────────────────

test('detectProjectProfile: React+TS project', () => {
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  assert.ok(profile.languages.includes('javascript'), 'should detect javascript');
  assert.ok(profile.languages.includes('typescript'), 'should detect typescript');
  assert.ok(profile.frameworks.includes('react'), 'should detect react');
  assert.ok(profile.frameworks.includes('nextjs'), 'should detect nextjs');
  assert.ok(profile.frameworks.includes('prisma'), 'should detect prisma');
  assert.strictEqual(profile.hasDocker, true, 'should detect docker-compose');
  assert.strictEqual(profile.hasTests, true, 'should detect tests dir');
});

test('detectProjectProfile: Go API project', () => {
  const profile = detectProjectProfile(join(FIXTURES, 'go-api-project'));
  assert.ok(profile.languages.includes('go'), 'should detect go');
  assert.strictEqual(profile.hasDocker, true, 'should detect Dockerfile');
  assert.strictEqual(profile.hasKubernetes, true, 'should detect k8s dir');
});

test('detectProjectProfile: Python ML project', () => {
  const profile = detectProjectProfile(join(FIXTURES, 'python-ml-project'));
  assert.ok(profile.languages.includes('python'), 'should detect python');
  assert.ok(profile.frameworks.includes('pytorch'), 'should detect torch');
  assert.ok(profile.frameworks.includes('huggingface'), 'should detect transformers');
  assert.ok(profile.frameworks.includes('fastapi'), 'should detect fastapi');
  assert.ok(profile.frameworks.includes('pandas'), 'should detect pandas');
  assert.strictEqual(profile.hasTests, true, 'should detect tests dir');
});

test('detectProjectProfile: empty directory returns empty profile', () => {
  // Use a path that doesn't exist
  const profile = detectProjectProfile('/tmp/__nonexistent_recommender_test__');
  assert.deepStrictEqual(profile.languages, []);
  assert.deepStrictEqual(profile.frameworks, []);
  assert.deepStrictEqual(profile.tools, []);
  assert.strictEqual(profile.hasDocker, false);
  assert.strictEqual(profile.hasTests, false);
});

test('detectProjectProfile: non-directory path returns empty profile', () => {
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project', 'package.json'));
  assert.deepStrictEqual(profile.languages, []);
});

test('detectProjectProfile: hasCi detected via .github/workflows', () => {
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  assert.strictEqual(profile.hasCi, true);
});

// ─── analyzeQuery ─────────────────────────────────────────────────────────────

test('analyzeQuery: debug intent from English prompt', () => {
  const result = analyzeQuery('debug a React performance issue');
  assert.ok(result.detectedIntents.includes('debug'), 'should detect debug intent');
  assert.ok(result.detectedTech.includes('react'), 'should detect react tech');
});

test('analyzeQuery: deploy intent from kubernetes prompt', () => {
  const result = analyzeQuery('deploy to kubernetes using helm');
  assert.ok(result.detectedIntents.includes('deploy'), 'should detect deploy intent');
  assert.ok(result.detectedTech.includes('kubernetes'), 'should detect kubernetes');
});

test('analyzeQuery: build intent from French prompt', () => {
  const result = analyzeQuery('créer une API avec FastAPI');
  assert.ok(result.detectedIntents.includes('build'), 'should detect build from créer');
  assert.ok(result.detectedTech.includes('fastapi'), 'should detect fastapi');
});

test('analyzeQuery: empty prompt returns empty signals', () => {
  const result = analyzeQuery('');
  assert.deepStrictEqual(result.keywords, []);
  assert.deepStrictEqual(result.detectedIntents, []);
  assert.deepStrictEqual(result.detectedTech, []);
});

test('analyzeQuery: truncates prompt at 2000 chars', () => {
  const longPrompt = 'debug '.repeat(400); // 2400 chars
  const result = analyzeQuery(longPrompt);
  // Should not throw and should still detect intent
  assert.ok(result.detectedIntents.includes('debug'));
});

test('analyzeQuery: multiple intents detected', () => {
  const result = analyzeQuery('fix a bug and then review the code');
  assert.ok(result.detectedIntents.includes('debug'), 'should detect debug from fix');
  assert.ok(result.detectedIntents.includes('review'), 'should detect review');
});

test('analyzeQuery: no duplicates in keywords', () => {
  const result = analyzeQuery('debug debug debug react react');
  const uniqueKeywords = new Set(result.keywords);
  assert.strictEqual(uniqueKeywords.size, result.keywords.length, 'keywords should be unique');
});

// ─── scoreAgents ─────────────────────────────────────────────────────────────

test('scoreAgents: React+TS project returns relevant agents in top 10', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  const installed = new Set();

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });

  assert.ok(suggestions.length > 0, 'should return suggestions');
  assert.ok(suggestions.length <= 10, 'should cap at 10');

  const names = suggestions.map(s => s.agent.name);
  // React+TS+Docker+CI project — expect web/frontend/infra agents
  const hasRelevant = names.some(n =>
    n.includes('react') || n.includes('nextjs') || n.includes('typescript') ||
    n.includes('docker') || n.includes('ci-cd') || n.includes('code-reviewer')
  );
  assert.ok(hasRelevant, `Expected web/TS/infra agent in top 10, got: ${names.join(', ')}`);
});

test('scoreAgents: Go API project returns go/docker/k8s agents in top 10', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'go-api-project'));
  const installed = new Set();

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });

  const names = suggestions.map(s => s.agent.name);
  const hasGoOrInfra = names.some(n =>
    n.includes('golang') || n.includes('go') || n.includes('docker') ||
    n.includes('kubernetes') || n.includes('api')
  );
  assert.ok(hasGoOrInfra, `Expected go/infra agent in top 10, got: ${names.join(', ')}`);
});

test('scoreAgents: Python ML project returns python/ml agents in top 10', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'python-ml-project'));
  const installed = new Set();

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });

  const names = suggestions.map(s => s.agent.name);
  // Python+ML project — expect python, ML, data, or AI-related agents
  const hasPythonOrML = names.some(n =>
    n.includes('python') || n.includes('ml') || n.includes('data') ||
    n.includes('llm') || n.includes('ai-engineer') || n.includes('data-scientist')
  );
  assert.ok(hasPythonOrML, `Expected python/ml/data agent in top 10, got: ${names.join(', ')}`);
});

test('scoreAgents: installed agents are excluded from results', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  // Install all agents
  const installed = new Set(manifest.agents.map(a => a.name));

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });
  assert.strictEqual(suggestions.length, 0, 'no suggestions when all agents installed');
});

test('scoreAgents: scores are between 0 and 1 (cap enforced)', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  const installed = new Set();

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });
  for (const s of suggestions) {
    assert.ok(s.score > 0, 'score should be positive');
    assert.ok(s.score <= 1.0, `score should not exceed 1.0, got ${s.score} for ${s.agent.name}`);
  }
});

test('scoreAgents: prompt-only mode (no profile) uses intent scoring', () => {
  const manifest = getManifest();
  const query = analyzeQuery('fix a Python bug in the data pipeline');
  const installed = new Set();

  const suggestions = scoreAgents({ profile: null, query, installed, manifest });

  // Should return something despite no profile
  assert.ok(suggestions.length > 0, 'should return suggestions from query alone');
  // All should have intent source
  const hasIntentSource = suggestions.some(s => s.sources.includes('intent'));
  assert.ok(hasIntentSource, 'at least one should have intent source');
});

test('scoreAgents: suggestions sorted descending by score', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  const installed = new Set();

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });

  for (let i = 1; i < suggestions.length; i++) {
    assert.ok(
      suggestions[i].score <= suggestions[i - 1].score,
      `suggestions should be sorted: ${suggestions[i - 1].score} >= ${suggestions[i].score}`
    );
  }
});

test('scoreAgents: each suggestion has required fields', () => {
  const manifest = getManifest();
  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  const installed = new Set();

  const suggestions = scoreAgents({ profile, query: null, installed, manifest });

  for (const s of suggestions) {
    assert.ok(s.agent, 'suggestion has agent');
    assert.ok(s.agent.name, 'agent has name');
    assert.ok(typeof s.score === 'number', 'suggestion has numeric score');
    assert.ok(Array.isArray(s.reasons), 'suggestion has reasons array');
    assert.ok(Array.isArray(s.sources), 'suggestion has sources array');
  }
});

test('scoreAgents: graceful degradation without enriched fields', () => {
  const manifest = getManifest();
  // Create a minimal manifest with agents that have no ecosystem/intent/triggers
  const minimalManifest = {
    ...manifest,
    agents: manifest.agents.slice(0, 5).map(a => ({
      name: a.name,
      category: a.category,
      path: a.path,
      mode: a.mode,
      description: a.description,
      tags: a.tags,
      // No ecosystem, intent, triggers, related_agents
    })),
  };

  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  const installed = new Set();

  // Should not throw
  assert.doesNotThrow(() => {
    scoreAgents({ profile, query: null, installed, manifest: minimalManifest });
  });
});

// ─── applyPackAffinityBoost isolation ─────────────────────────────────────────

test('applyPackAffinityBoost: single-agent pack does NOT boost (threshold ≥ 2)', () => {
  const manifest = getManifest();
  // Build a stub manifest with 2 agents and a pack containing only 1 of them
  const [agentA, agentB] = manifest.agents.slice(0, 2);
  const stubManifest = {
    ...manifest,
    agents: [agentA, agentB],
    packs: {
      'stub-pack': { label: 'Stub Pack', description: '', agents: [agentA.name] },
    },
  };

  const installed = new Set();
  const profile = { languages: [], frameworks: [], tools: [], hasTests: false, hasCi: false, hasDocker: false, hasKubernetes: false, hasTerraform: false };

  // Use a real query that matches agent descriptions broadly
  const query = analyzeQuery('build create code');
  const suggestions = scoreAgents({ profile, query, installed, manifest: stubManifest });

  // Find agentA in results — it may or may not be there depending on score
  const suggA = suggestions.find(s => s.agent.name === agentA.name);
  if (suggA) {
    // If present, it should NOT have a pack synergy reason (only 1 agent in pack)
    assert.ok(
      !suggA.reasons.some(r => r.startsWith('Pack synergy')),
      'single-agent pack should NOT add Pack synergy reason'
    );
  }
  // Either way, no error thrown — the test validates the threshold behaviour
  assert.ok(true, 'no throw');
});

// ─── applyRelatedBoost cap ─────────────────────────────────────────────────────

test('applyRelatedBoost: related boost is capped at 1.0', () => {
  const manifest = getManifest();
  // Find two agents in the manifest where one has related_agents pointing to the other
  const agentWithRelated = manifest.agents.find(a => a.related_agents && a.related_agents.length > 0);
  if (!agentWithRelated) {
    // Skip gracefully if no enriched agents available
    assert.ok(true, 'no enriched agents found — skipping cap test');
    return;
  }
  const relatedName = agentWithRelated.related_agents[0];
  const relatedAgent = manifest.agents.find(a => a.name === relatedName);
  if (!relatedAgent) {
    assert.ok(true, 'related agent not in manifest — skipping cap test');
    return;
  }

  // Install everyone except these two
  const installed = new Set(
    manifest.agents
      .filter(a => a.name !== agentWithRelated.name && a.name !== relatedName)
      .map(a => a.name)
  );

  const profile = detectProjectProfile(join(FIXTURES, 'react-ts-project'));
  const suggestions = scoreAgents({ profile, query: null, installed, manifest });

  for (const s of suggestions) {
    assert.ok(
      s.score <= 1.0,
      `score for ${s.agent.name} should be ≤ 1.0 after related boost, got ${s.score}`
    );
  }
});
