/**
 * @module recommender
 * Intelligent agent recommendation engine.
 * Stack Detector + Scoring Engine + Query Analyzer.
 * Zero external dependencies — Node 20+ built-ins only.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ─── Constants ────────────────────────────────────────────────────────────────

/** @type {Record<string, string>} dep name → framework label */
const FRAMEWORK_SIGNALS = {
  'react': 'react',
  'react-dom': 'react',
  'next': 'nextjs',
  'vue': 'vue',
  '@angular/core': 'angular',
  'express': 'express',
  'fastify': 'fastify',
  'hono': 'hono',
  'svelte': 'svelte',
  '@sveltejs/kit': 'sveltekit',
  'astro': 'astro',
  'remix': 'remix',
  'nuxt': 'nuxt',
  'react-native': 'react-native',
  'expo': 'expo',
  'electron': 'electron',
  'prisma': 'prisma',
  '@prisma/client': 'prisma',
  'drizzle-orm': 'drizzle',
  'mongoose': 'mongodb',
  'pg': 'postgres',
  'redis': 'redis',
  'ioredis': 'redis',
  'graphql': 'graphql',
  '@apollo/server': 'graphql',
  'stripe': 'stripe',
};

/** @type {Record<string, string>} python package → framework label */
const PYTHON_FRAMEWORK_SIGNALS = {
  'fastapi': 'fastapi',
  'django': 'django',
  'flask': 'flask',
  'torch': 'pytorch',
  'tensorflow': 'tensorflow',
  'transformers': 'huggingface',
  'langchain': 'langchain',
  'pandas': 'pandas',
  'numpy': 'numpy',
  'scikit-learn': 'sklearn',
  'sqlalchemy': 'sqlalchemy',
  'pytest': 'pytest',
};

/** Mapping language name → ecosystem tag (short form, matching manifest data) */
const LANG_TO_ECOSYSTEM = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  java: 'jvm',
  csharp: 'dotnet',
  swift: 'mobile',
  cpp: 'cpp',
};

/** Mapping tool name → ecosystem tag */
const TOOL_TO_ECOSYSTEM = {
  docker: 'devops',
  kubernetes: 'devops',
};

/** Frameworks that indicate a web project */
const WEB_FRAMEWORKS = new Set([
  'react', 'nextjs', 'vue', 'angular', 'svelte', 'sveltekit', 'astro',
  'remix', 'nuxt', 'rails', 'django', 'flask', 'fastapi', 'express',
  'fastify', 'hono',
]);

/** Frameworks/libraries that indicate an AI/ML project */
const AI_FRAMEWORKS = new Set([
  'pytorch', 'tensorflow', 'huggingface', 'langchain', 'sklearn', 'transformers',
]);

/** Frameworks/libraries that indicate a data project */
const DATA_FRAMEWORKS = new Set([
  'pandas', 'numpy', 'sqlalchemy', 'prisma', 'drizzle', 'mongodb',
]);

/** Scoring weights when both stack + query are available */
const WEIGHTS_DEFAULT = { stack: 0.5, intent: 0.4, tools: 0.1 };
/** Scoring weights when only prompt/query is available (no project profile) */
const WEIGHTS_PROMPT_ONLY = { stack: 0, intent: 1.0, tools: 0 };

/** @type {Record<string, string>} keyword → intent */
const INTENT_KEYWORDS = {
  // intent:build
  'build': 'build', 'create': 'build', 'implement': 'build', 'develop': 'build',
  'code': 'build', 'write': 'build', 'add': 'build', 'feature': 'build',
  'construire': 'build', 'créer': 'build', 'implémenter': 'build',
  // intent:debug
  'debug': 'debug', 'fix': 'debug', 'bug': 'debug', 'error': 'debug',
  'crash': 'debug', 'broken': 'debug', 'issue': 'debug', 'failing': 'debug',
  'corriger': 'debug', 'réparer': 'debug',
  // intent:review
  'review': 'review', 'check': 'review', 'audit': 'review', 'inspect': 'review',
  'relire': 'review', 'vérifier': 'review',
  // intent:migrate
  'migrate': 'migrate', 'upgrade': 'migrate', 'convert': 'migrate',
  'modernize': 'migrate', 'legacy': 'migrate', 'refactor': 'migrate',
  'migrer': 'migrate', 'moderniser': 'migrate',
  // intent:deploy
  'deploy': 'deploy', 'ship': 'deploy', 'release': 'deploy',
  'ci': 'deploy', 'cd': 'deploy', 'pipeline': 'deploy',
  'déployer': 'deploy', 'livrer': 'deploy',
  // intent:design
  'design': 'design', 'architect': 'design', 'architecture': 'design',
  'schema': 'design', 'diagram': 'design', 'concevoir': 'design',
  // intent:document
  'document': 'document', 'docs': 'document', 'readme': 'document',
  'api-doc': 'document', 'documenter': 'document',
  // intent:optimize
  'optimize': 'optimize', 'performance': 'optimize', 'slow': 'optimize',
  'fast': 'optimize', 'speed': 'optimize', 'optimiser': 'optimize',
  // intent:plan
  'plan': 'plan', 'roadmap': 'plan', 'sprint': 'plan', 'backlog': 'plan',
  'requirement': 'plan', 'prd': 'plan', 'planifier': 'plan',
  // intent:test
  'test': 'test', 'testing': 'test', 'spec': 'test', 'coverage': 'test',
  'tester': 'test',
  // intent:analyze
  'analyze': 'analyze', 'data': 'analyze', 'analytics': 'analyze',
  'dashboard': 'analyze', 'analyser': 'analyze',
};

/** Set of technical keywords for query analysis */
const TECH_KEYWORDS = new Set([
  'react', 'nextjs', 'next.js', 'vue', 'angular', 'svelte',
  'typescript', 'javascript', 'python', 'go', 'golang', 'rust',
  'ruby', 'rails', 'php', 'java', 'kotlin', 'swift', 'csharp', 'c#',
  'docker', 'kubernetes', 'k8s', 'terraform', 'aws', 'gcp', 'azure',
  'postgres', 'postgresql', 'redis', 'mongodb', 'graphql', 'rest', 'api',
  'fastapi', 'django', 'flask', 'express', 'fastify', 'hono',
  'prisma', 'drizzle', 'sqlalchemy',
  'pytorch', 'tensorflow', 'ml', 'ai', 'llm', 'langchain', 'rag',
  'mcp', 'opencode',
  'ci/cd', 'cicd', 'github-actions', 'gitlab',
  'security', 'penetration', 'audit',
  'accessibility', 'wcag', 'a11y',
]);

// ─── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   languages: string[];
 *   frameworks: string[];
 *   tools: string[];
 *   hasTests: boolean;
 *   hasCi: boolean;
 *   hasDocker: boolean;
 *   hasKubernetes: boolean;
 *   hasTerraform: boolean;
 * }} ProjectProfile
 */

/**
 * @typedef {{
 *   keywords: string[];
 *   detectedIntents: string[];
 *   detectedTech: string[];
 * }} QuerySignals
 */

/**
 * @typedef {{
 *   agent: import('./registry.mjs').AgentEntry;
 *   score: number;
 *   reasons: string[];
 *   sources: Array<'stack' | 'intent' | 'pack' | 'related'>;
 * }} Suggestion
 */

// ─── Stack Detector ──────────────────────────────────────────────────────────

/**
 * Returns an empty ProjectProfile — used when detection fails.
 * @returns {ProjectProfile}
 */
function emptyProfile() {
  return {
    languages: [],
    frameworks: [],
    tools: [],
    hasTests: false,
    hasCi: false,
    hasDocker: false,
    hasKubernetes: false,
    hasTerraform: false,
  };
}

/**
 * Detect project stack from filesystem signals.
 * Reads common project files (package.json, go.mod, etc.) to detect languages,
 * frameworks, and infrastructure tools. Non-throwing — returns emptyProfile() on errors.
 * @param {string} directory
 * @param {number} [_depth] — internal recursion depth (0 = root call)
 * @returns {ProjectProfile}
 */
export function detectProjectProfile(directory, _depth = 0) {
  const absDir = resolve(directory);

  // Guard: must be an accessible directory
  try {
    const stat = statSync(absDir);
    if (!stat.isDirectory()) return emptyProfile();
  } catch {
    return emptyProfile();
  }

  const languages = new Set();
  const frameworks = new Set();
  const tools = new Set();
  let hasTests = false;
  let hasCi = false;
  let hasDocker = false;
  let hasKubernetes = false;
  let hasTerraform = false;

  // ── package.json ────────────────────────────────────────
  const pkgPath = join(absDir, 'package.json');
  if (existsSync(pkgPath)) {
    languages.add('javascript');
    try {
      // Guard: skip if > 5MB (malformed or unusual)
      if (statSync(pkgPath).size <= 5 * 1024 * 1024) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const allDeps = {
          ...(pkg.dependencies ?? {}),
          ...(pkg.devDependencies ?? {}),
        };
        for (const [dep] of Object.entries(allDeps)) {
          if (FRAMEWORK_SIGNALS[dep]) frameworks.add(FRAMEWORK_SIGNALS[dep]);
        }
        if (allDeps['typescript'] || existsSync(join(absDir, 'tsconfig.json'))) {
          languages.add('typescript');
        }
      }
    } catch { /* malformed package.json — just note JS */ }
  }

  // ── tsconfig.json (standalone, without package.json) ────
  if (!languages.has('typescript') && existsSync(join(absDir, 'tsconfig.json'))) {
    languages.add('typescript');
    languages.add('javascript');
  }

  // ── go.mod ──────────────────────────────────────────────
  if (existsSync(join(absDir, 'go.mod'))) {
    languages.add('go');
  }

  // ── Cargo.toml ──────────────────────────────────────────
  if (existsSync(join(absDir, 'Cargo.toml'))) {
    languages.add('rust');
  }

  // ── pyproject.toml / requirements.txt ───────────────────
  const hasPyproject = existsSync(join(absDir, 'pyproject.toml'));
  const hasRequirements = existsSync(join(absDir, 'requirements.txt'));
  if (hasPyproject || hasRequirements) {
    languages.add('python');
    try {
      const pyPath = hasPyproject
        ? join(absDir, 'pyproject.toml')
        : join(absDir, 'requirements.txt');
      // Guard: skip if > 5MB
      if (statSync(pyPath).size <= 5 * 1024 * 1024) {
        const content = readFileSync(pyPath, 'utf-8');
        const lower = content.toLowerCase();
        for (const [pkg, fw] of Object.entries(PYTHON_FRAMEWORK_SIGNALS)) {
          if (lower.includes(pkg)) frameworks.add(fw);
        }
      }
    } catch { /* best-effort */ }
  }

  // ── Gemfile ─────────────────────────────────────────────
  if (existsSync(join(absDir, 'Gemfile'))) {
    languages.add('ruby');
    try {
      const content = readFileSync(join(absDir, 'Gemfile'), 'utf-8');
      if (content.includes('rails')) frameworks.add('rails');
    } catch { /* best-effort */ }
  }

  // ── Java ────────────────────────────────────────────────
  if (existsSync(join(absDir, 'pom.xml')) || existsSync(join(absDir, 'build.gradle'))) {
    languages.add('java');
  }

  // ── C# ──────────────────────────────────────────────────
  try {
    const entries = readdirSync(absDir);
    if (entries.some(e => e.endsWith('.csproj'))) languages.add('csharp');
  } catch { /* best-effort */ }

  // ── Swift ───────────────────────────────────────────────
  if (existsSync(join(absDir, 'Package.swift'))) {
    languages.add('swift');
  }

  // ── Docker ──────────────────────────────────────────────
  if (
    existsSync(join(absDir, 'Dockerfile')) ||
    existsSync(join(absDir, 'docker-compose.yml')) ||
    existsSync(join(absDir, 'docker-compose.yaml'))
  ) {
    hasDocker = true;
    tools.add('docker');
  }

  // ── CI/CD ────────────────────────────────────────────────
  if (
    existsSync(join(absDir, '.github', 'workflows')) ||
    existsSync(join(absDir, '.gitlab-ci.yml')) ||
    existsSync(join(absDir, 'Jenkinsfile'))
  ) {
    hasCi = true;
    tools.add('ci-cd');
  }

  // ── Terraform ────────────────────────────────────────────
  if (existsSync(join(absDir, 'terraform'))) {
    hasTerraform = true;
    tools.add('terraform');
  } else {
    try {
      const entries = readdirSync(absDir);
      if (entries.some(e => e.endsWith('.tf'))) {
        hasTerraform = true;
        tools.add('terraform');
      }
    } catch { /* best-effort */ }
  }

  // ── Kubernetes ───────────────────────────────────────────
  if (
    existsSync(join(absDir, 'k8s')) ||
    existsSync(join(absDir, '.k8s')) ||
    existsSync(join(absDir, 'helm')) ||
    existsSync(join(absDir, 'Chart.yaml'))
  ) {
    hasKubernetes = true;
    tools.add('kubernetes');
  }

  // ── Tests ────────────────────────────────────────────────
  const testDirs = ['tests', 'test', '__tests__', 'spec'];
  for (const dir of testDirs) {
    if (existsSync(join(absDir, dir))) {
      hasTests = true;
      break;
    }
  }

  // ── Monorepo scan (1 level, root call only) ──────────────
  // Only scan workspace dirs at depth 0 to avoid unbounded recursion.
  if (_depth === 0 && languages.size < 2) {
    const MONOREPO_DIRS = ['packages', 'apps', 'services'];
    for (const monoDir of MONOREPO_DIRS) {
      const monoPath = join(absDir, monoDir);
      if (!existsSync(monoPath)) continue;
      try {
        for (const entry of readdirSync(monoPath, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const subDir = join(monoPath, entry.name);
          // _depth=1 ensures sub-packages never trigger another monorepo scan
          const subProfile = detectProjectProfile(subDir, 1);
          for (const lang of subProfile.languages) languages.add(lang);
          for (const fw of subProfile.frameworks) frameworks.add(fw);
          for (const tool of subProfile.tools) tools.add(tool);
          if (subProfile.hasTests) hasTests = true;
          if (subProfile.hasCi) hasCi = true;
          if (subProfile.hasDocker) hasDocker = true;
          if (subProfile.hasKubernetes) hasKubernetes = true;
          if (subProfile.hasTerraform) hasTerraform = true;
        }
      } catch { /* best-effort */ }
    }
  }

  return {
    languages: [...languages],
    frameworks: [...frameworks],
    tools: [...tools],
    hasTests,
    hasCi,
    hasDocker,
    hasKubernetes,
    hasTerraform,
  };
}

// ─── Query Analyzer ───────────────────────────────────────────────────────────

/**
 * Analyze a user prompt to extract intent and tech keywords.
 * No NLP library — simple tokenization + dictionary matching.
 * `keywords` contains only tokens that matched an intent or a tech term.
 * `detectedIntents` and `detectedTech` are the categorized subsets.
 * @param {string} prompt
 * @returns {QuerySignals}
 */
export function analyzeQuery(prompt) {
  // Guard: truncate at 2000 chars to avoid pathological inputs
  const input = prompt.length > 2000 ? prompt.slice(0, 2000) : prompt;

  // Tokenize: split on spaces/punctuation, lowercase, preserve accents via \p{L}\p{N}
  const tokens = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s\-./#+]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  const keywords = [];
  const detectedIntents = new Set();
  const detectedTech = new Set();

  for (const token of tokens) {
    if (INTENT_KEYWORDS[token]) {
      detectedIntents.add(INTENT_KEYWORDS[token]);
      keywords.push(token);
    }
    if (TECH_KEYWORDS.has(token)) {
      detectedTech.add(token);
      keywords.push(token);
    }
  }

  // Bi-gram check — defensive dead code in practice:
  // The tokenizer keeps `.` and `/`, so `next.js` remains a single token.
  // Kept for edge cases where the prompt encodes differently.
  for (let i = 0; i < tokens.length - 1; i++) {
    const bigram = `${tokens[i]}.${tokens[i + 1]}`;
    const bigramDash = `${tokens[i]}-${tokens[i + 1]}`;
    if (TECH_KEYWORDS.has(bigram)) detectedTech.add(bigram);
    if (TECH_KEYWORDS.has(bigramDash)) detectedTech.add(bigramDash);
  }

  return {
    keywords: [...new Set(keywords)],
    detectedIntents: [...detectedIntents],
    detectedTech: [...detectedTech],
  };
}

// ─── Scoring Engine ───────────────────────────────────────────────────────────

/**
 * Fallback stack score when agent.ecosystem is absent.
 * Uses agent.tags and agent.description — capped at 0.6 to incentivize metadata completion.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {ProjectProfile} profile
 * @returns {number}
 */
function computeFallbackStackScore(agent, profile) {
  const text = [
    ...(agent.tags ?? []),
    agent.description.toLowerCase(),
    agent.category,
  ].join(' ').toLowerCase();

  let matches = 0;
  const signals = [...profile.languages, ...profile.frameworks, ...profile.tools];
  for (const signal of signals) {
    if (text.includes(signal.toLowerCase())) matches++;
  }
  if (signals.length === 0) return 0;
  return Math.min((matches / signals.length) * 0.9, 0.6);
}

/**
 * Compute ecosystem-based stack score using Jaccard similarity.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {ProjectProfile} profile
 * @returns {number}
 */
function computeStackScore(agent, profile) {
  if (!agent.ecosystem || agent.ecosystem.length === 0) {
    return computeFallbackStackScore(agent, profile);
  }

  const profileEcosystems = new Set();
  for (const lang of profile.languages) {
    if (LANG_TO_ECOSYSTEM[lang]) profileEcosystems.add(LANG_TO_ECOSYSTEM[lang]);
  }
  for (const tool of profile.tools) {
    if (TOOL_TO_ECOSYSTEM[tool]) profileEcosystems.add(TOOL_TO_ECOSYSTEM[tool]);
  }
  // Detected web frameworks → web ecosystem (only actual web frameworks, not ML libs)
  if (profile.frameworks.some(fw => WEB_FRAMEWORKS.has(fw))) profileEcosystems.add('web');
  // Detected AI/ML frameworks → ai ecosystem
  if (profile.frameworks.some(fw => AI_FRAMEWORKS.has(fw))) profileEcosystems.add('ai');
  // Detected data frameworks → data ecosystem
  if (profile.frameworks.some(fw => DATA_FRAMEWORKS.has(fw))) profileEcosystems.add('data');

  // Normalize agent ecosystem tags: strip 'ecosystem:' prefix if present
  const agentEco = agent.ecosystem.map(e => e.replace(/^ecosystem:/, ''));

  // Jaccard: |intersection| / |union|
  let intersection = 0;
  for (const eco of agentEco) {
    if (profileEcosystems.has(eco)) intersection++;
  }
  const union = new Set([...agentEco, ...profileEcosystems]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Get human-readable reasons for stack match.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {ProjectProfile} profile
 * @returns {string[]}
 */
function getStackReasons(agent, profile) {
  const reasons = [];
  if (profile.languages.length > 0) {
    reasons.push(`Stack match: ${profile.languages.join(', ')}`);
  }
  if (profile.frameworks.length > 0) {
    reasons.push(`Frameworks: ${profile.frameworks.slice(0, 3).join(', ')}`);
  }
  return reasons;
}

/**
 * Compute intent score from query signals.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {QuerySignals} query
 * @returns {number}
 */
function computeIntentScore(agent, query) {
  let score = 0;

  // Intent tag match (strong signal)
  if (agent.intent) {
    for (const intentTag of agent.intent) {
      // Normalize: strip 'intent:' prefix if present
      const intent = intentTag.replace(/^intent:/, '');
      if (query.detectedIntents.includes(intent)) {
        score += 0.5;
        break; // one match is enough
      }
    }
  }

  // Trigger keyword match (medium signal)
  if (agent.triggers) {
    const triggerMatches = agent.triggers.filter(t =>
      query.keywords.some(k => k === t || (k.length >= 4 && (t.includes(k) || k.includes(t))))
    );
    score += Math.min(triggerMatches.length * 0.1, 0.3);
  }

  // Description keyword match (weak signal)
  const descLower = agent.description.toLowerCase();
  const descMatches = query.keywords.filter(k => descLower.includes(k));
  score += Math.min(descMatches.length * 0.05, 0.2);

  return Math.min(score, 1);
}

/**
 * Get human-readable reasons for intent match.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {QuerySignals} query
 * @returns {string[]}
 */
function getIntentReasons(agent, query) {
  const reasons = [];
  if (agent.intent) {
    const matched = agent.intent
      .map(t => t.replace(/^intent:/, ''))
      .filter(i => query.detectedIntents.includes(i));
    if (matched.length > 0) {
      reasons.push(`Intent: ${matched.join(', ')}`);
    }
  }
  if (query.detectedTech.length > 0) {
    reasons.push(`Keywords: ${query.detectedTech.slice(0, 3).join(', ')}`);
  }
  return reasons;
}

/**
 * Infra tools bonus based on detected project tools (Docker, K8s, Terraform).
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {ProjectProfile} profile
 * @returns {number}
 */
function computeToolsBonus(agent, profile) {
  const text = [
    ...(agent.tags ?? []),
    agent.description.toLowerCase(),
  ].join(' ').toLowerCase();

  let bonus = 0;
  if (profile.hasDocker && text.includes('docker')) bonus += 0.4;
  if (profile.hasKubernetes && text.includes('kubernetes')) bonus += 0.4;
  if (profile.hasTerraform && text.includes('terraform')) bonus += 0.3;
  if (profile.hasCi && (text.includes('ci/cd') || text.includes('pipeline') || text.includes('ci-cd'))) bonus += 0.2;
  return Math.min(bonus, 1.0);
}

/**
 * Boost agents that co-appear in packs where ≥2 agents are already in results.
 * @param {Suggestion[]} scores
 * @param {import('./registry.mjs').Manifest} manifest
 */
function applyPackAffinityBoost(scores, manifest) {
  const scoreMap = new Map(scores.map(s => [s.agent.name, s]));

  for (const [, pack] of Object.entries(manifest.packs)) {
    const inResults = pack.agents.filter(name => scoreMap.has(name));
    if (inResults.length >= 2) {
      for (const name of pack.agents) {
        const entry = scoreMap.get(name);
        if (entry) {
          entry.score = Math.min(entry.score * 1.1, 1.0);
          if (!entry.reasons.includes(`Pack synergy: ${pack.label}`)) {
            entry.reasons.push(`Pack synergy: ${pack.label}`);
          }
        }
      }
    }
  }
}

/**
 * Boost related agents of the current top-5 scorers.
 * Operates on a copy for sorting to avoid mutating the array before final sort.
 * @param {Suggestion[]} scores
 */
function applyRelatedBoost(scores) {
  const scoreMap = new Map(scores.map(s => [s.agent.name, s]));
  // Sort on a copy — don't mutate `scores` before the final sort in scoreAgents
  const topAgents = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  for (const top of topAgents) {
    if (!top.agent.related_agents) continue;
    for (const relatedName of top.agent.related_agents) {
      const related = scoreMap.get(relatedName);
      if (related) {
        related.score = Math.min(related.score + 0.05, 1.0);
        if (!related.reasons.some(r => r.startsWith('Related to'))) {
          related.reasons.push(`Related to ${top.agent.name}`);
          if (!related.sources.includes('related')) related.sources.push('related');
        }
      }
    }
  }
}

/**
 * Score all agents against the project profile and/or query signals.
 * Returns up to 10 suggestions sorted by score descending.
 *
 * @param {{
 *   profile: ProjectProfile | null;
 *   query?: QuerySignals | null;
 *   installed: Set<string>;
 *   manifest: import('./registry.mjs').Manifest;
 * }} input
 * @returns {Suggestion[]}
 */
export function scoreAgents({ profile, query, installed, manifest }) {
  const agents = manifest.agents;
  /** @type {Suggestion[]} */
  const scores = [];

  // Redistribute weights when no project profile (prompt-only mode)
  const W = profile ? WEIGHTS_DEFAULT : WEIGHTS_PROMPT_ONLY;

  for (const agent of agents) {
    // Skip already-installed agents
    if (installed.has(agent.name)) continue;

    let totalScore = 0;
    /** @type {string[]} */
    const reasons = [];
    /** @type {Set<'stack' | 'intent' | 'pack' | 'related'>} */
    const sources = new Set();

    // ── 1. Stack Score (0-1, weight: W.stack) ─────────────
    if (profile) {
      const stackScore = computeStackScore(agent, profile);
      if (stackScore > 0) {
        totalScore += stackScore * W.stack;
        reasons.push(...getStackReasons(agent, profile));
        sources.add('stack');
      }
    }

    // ── 2. Intent Score (0-1, weight: W.intent) ──────────
    if (query) {
      const intentScore = computeIntentScore(agent, query);
      if (intentScore > 0) {
        totalScore += intentScore * W.intent;
        reasons.push(...getIntentReasons(agent, query));
        sources.add('intent');
      }
    }

    // ── 3. Tools/infra bonus (0-W.tools) ─────────────────
    if (profile) {
      const toolsBonus = computeToolsBonus(agent, profile);
      totalScore += toolsBonus * W.tools;
    }

    if (totalScore > 0) {
      scores.push({ agent, score: totalScore, reasons, sources: [...sources] });
    }
  }

  // ── 4. Pack affinity boost ────────────────────────────
  applyPackAffinityBoost(scores, manifest);

  // ── 5. Related agents boost ───────────────────────────
  applyRelatedBoost(scores);

  // Sort descending, cap at 10
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 10);
}
