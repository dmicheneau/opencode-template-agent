import { mkdirSync, existsSync, writeFileSync, lstatSync, unlinkSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname, resolve as pathResolve, sep } from 'node:path';
import https from 'node:https';
import { loadManifest } from './registry.mjs';
import {
  installSuccess,
  installSkipped,
  installDryRun,
  installError,
  installSummary,
  infoMessage,
} from './display.mjs';
import { USER_AGENT } from './meta.mjs';
import { recordInstall, removeLockEntry } from './lock.mjs';

// ─── Constants ───────────────────────────────────────────────────────────────────

const ALLOWED_HOSTS = ['raw.githubusercontent.com', 'objects.githubusercontent.com', 'github.com'];
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_SIZE = 1024 * 1024; // 1 MB

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * @typedef {{
 *   force?: boolean;
 *   dryRun?: boolean;
 *   cwd?: string;
 * }} InstallOptions
 */

// ─── HTTP Download ──────────────────────────────────────────────────────────────

/**
 * Download a file from a URL (HTTPS only, with redirect limit and domain allowlist).
 * @param {string} url
 * @param {number} [_redirectCount=0]
 * @returns {Promise<string>}
 */
function download(url, _redirectCount = 0) {
  if (_redirectCount > MAX_REDIRECTS) {
    return Promise.reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`));
  }

  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    return Promise.reject(new Error(`Refusing non-HTTPS URL: ${url}`));
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return Promise.reject(new Error(`Refusing untrusted host: ${parsed.hostname}`));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        download(res.headers.location, _redirectCount + 1).then(resolve, reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume(); // Drain the response
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      /** @type {Buffer[]} */
      const chunks = [];
      let totalSize = 0;
      let destroyed = false;

      res.on('data', (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          destroyed = true;
          request.destroy(new Error(`Response exceeds ${MAX_RESPONSE_SIZE} bytes`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        if (!destroyed) resolve(Buffer.concat(chunks).toString('utf-8'));
      });
      res.on('error', reject);
    });

    request.on('error', reject);
    request.setTimeout(30_000, () => {
      request.destroy(new Error(`Timeout downloading ${url}`));
    });
  });
}

// ─── Destination Path ───────────────────────────────────────────────────────────

/**
 * Compute the destination path for an agent.
 * Primary agents go to `.opencode/agents/<name>.md`
 * Subagents go to `.opencode/agents/<category>/<name>.md`
 *
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {string} cwd
 * @returns {{ absolute: string; relative: string }}
 */
function getDestination(agent, cwd) {
  const basePath = loadManifest().base_path;
  /** @type {string} */
  let relative;

  if (agent.mode === 'primary') {
    // Primary agents sit at root of agents dir
    relative = join(basePath, `${agent.name}.md`);
  } else {
    // Subagents go into category subdirectory
    relative = join(basePath, agent.category, `${agent.name}.md`);
  }

  const absolute = pathResolve(cwd, relative);
  const safeBase = pathResolve(cwd, basePath);

  if (!absolute.startsWith(safeBase + sep) && absolute !== safeBase) {
    throw new Error(`Security: path "${relative}" escapes agents directory. Agent "${agent.name}" rejected.`);
  }

  return {
    absolute,
    relative,
  };
}

/**
 * Build the raw GitHub URL for an agent.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @returns {string}
 */
function getDownloadUrl(agent) {
  const manifest = loadManifest();
  const filePath = `${manifest.base_path}/${agent.path}`;

  // Ensure the path ends with the agent filename
  const url = `https://raw.githubusercontent.com/${manifest.repo}/${manifest.branch}/${filePath}.md`;
  return url;
}

// ─── Install Single Agent ───────────────────────────────────────────────────────

/**
 * Install a single agent file.
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {InstallOptions} options
 * @returns {Promise<'installed' | 'skipped' | 'failed'>}
 */
async function installAgent(agent, options) {
  const cwd = options.cwd ?? process.cwd();
  const dest = getDestination(agent, cwd);

  // Dry run: just show what would happen
  if (options.dryRun) {
    installDryRun(agent.name, dest.relative);
    return 'installed';
  }

  // Check if file already exists
  if (existsSync(dest.absolute) && !options.force) {
    installSkipped(agent.name, dest.relative);
    return 'skipped';
  }

  try {
    const url = getDownloadUrl(agent);
    const content = await download(url);

    // Create directory structure
    const dir = dirname(dest.absolute);
    mkdirSync(dir, { recursive: true });

    // Write the agent file
    writeFileSync(dest.absolute, content, 'utf-8');
    recordInstall(agent.name, content, cwd);
    installSuccess(agent.name, dest.relative);
    return 'installed';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    installError(agent.name, message);
    return 'failed';
  }
}

// ─── Batch Install ──────────────────────────────────────────────────────────────

/**
 * Install multiple agents and print a summary.
 * @param {import('./registry.mjs').AgentEntry[]} agents
 * @param {InstallOptions} options
 * @returns {Promise<{ installed: number; skipped: number; failed: number }>}
 */
export async function installAgents(agents, options = {}) {
  if (options.dryRun) {
    infoMessage('Dry run — no files will be written\n');
  }

  const counts = { installed: 0, skipped: 0, failed: 0 };

  for (const agent of agents) {
    const result = await installAgent(agent, options);
    counts[result]++;
  }

  installSummary(counts);
  return counts;
}

// ─── Uninstall Single Agent ─────────────────────────────────────────────────

/**
 * @typedef {{
 *   dryRun?: boolean;
 *   cwd?: string;
 * }} UninstallOptions
 */

/**
 * Uninstall a single agent file.
 * SEC-04: refuses to delete symlinks to prevent directory-traversal attacks.
 *
 * @param {import('./registry.mjs').AgentEntry} agent
 * @param {UninstallOptions} options
 * @returns {'removed' | 'not_found' | 'failed'}
 */
export function uninstallAgent(agent, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const dest = getDestination(agent, cwd);

  if (!existsSync(dest.absolute)) {
    return 'not_found';
  }

  // Dry run: report without touching disk (avoids widening TOCTOU window)
  if (options.dryRun) {
    return 'removed';
  }

  // SEC-04: Refuse to delete symlinks — lstat + unlink kept tight to minimize TOCTOU window
  try {
    const stat = lstatSync(dest.absolute);
    if (stat.isSymbolicLink()) {
      throw new Error(`Security: "${dest.relative}" is a symlink. Refusing to delete.`);
    }
    unlinkSync(dest.absolute);
    try {
      removeLockEntry(agent.name, cwd);
    } catch (lockErr) {
      process.stderr.write(`Warning: agent "${agent.name}" uninstalled but lock update failed: ${lockErr.message}\n`);
    }

    // Cleanup empty parent directories for non-primary agents (category dirs)
    if (agent.mode !== 'primary') {
      const parentDir = dirname(dest.absolute);
      try {
        const remaining = readdirSync(parentDir);
        if (remaining.length === 0) {
          rmdirSync(parentDir);
        }
      } catch {
        // Ignore cleanup errors — the agent file is already removed
      }
    }

    return 'removed';
  } catch (err) {
    // Re-throw security errors — they must not be silenced
    if (err && err.message && err.message.startsWith('Security:')) throw err;
    return 'failed';
  }
}

// ─── Batch Uninstall ────────────────────────────────────────────────────────

/**
 * Uninstall multiple agents and return a summary.
 * @param {import('./registry.mjs').AgentEntry[]} agents
 * @param {UninstallOptions} options
 * @returns {{ removed: number; not_found: number; failed: number }}
 */
export function uninstallAgents(agents, options = {}) {
  if (options.dryRun) {
    infoMessage('Dry run — no files will be deleted\n');
  }

  const counts = { removed: 0, not_found: 0, failed: 0 };

  for (const agent of agents) {
    try {
      const result = uninstallAgent(agent, options);
      counts[result]++;
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      process.stderr.write(`Error uninstalling "${agent.name}": ${message}\n`);
      counts.failed++;
    }
  }

  return counts;
}
