// ─── index.mjs ── TUI Orchestrator ──────────────────────────────────────────
// Lifecycle, wiring, signal handlers. Connects input → state → render → screen.
// Zero npm deps, Node 20+ ESM.
// ─────────────────────────────────────────────────────────────────────────────

import { enter, exit, flush, invalidate, getSize, onResize, onInput } from './screen.mjs';
import { parseKey } from './input.mjs';
import { createInitialState, update, getViewportHeight, detectInstalled } from './state.mjs';
import { render } from './renderer.mjs';
import { SPINNER_INTERVAL_MS } from './ansi.mjs';

/**
 * Launch the interactive TUI.
 * Resolves when the user quits.
 * @param {object} [options]
 * @param {boolean} [options.force] - Overwrite existing files
 * @returns {Promise<void>}
 */
export async function launchTUI(options = {}) {
  // ─── Guard: TTY required ──────────────────────────────────────────────
  if (!process.stdin.isTTY) {
    console.error('Error: TUI requires an interactive terminal (TTY)');
    process.exit(1);
  }

  // ─── Load data (dynamic import — lazy loading) ────────────────────────
  const { loadManifest } = await import('../registry.mjs');
  const manifest = loadManifest();

  // ─── Initialize ───────────────────────────────────────────────────────
  let state = createInitialState(manifest, getSize());
  enter();

  // ─── C3: Console hijacking state at launchTUI scope ───────────────────
  const origLog = console.log;
  const origError = console.error;
  let consoleHijacked = false;

  // ─── Render function (microtask-coalesced) ─────────────────────────────
  /** Direct flush — used by spinner interval which must fire consistently. */
  const forceRedraw = () => flush(render(state));

  /** Coalesced redraw — batches rapid state changes into a single frame. */
  let redrawPending = false;
  const redraw = () => {
    if (redrawPending) return;
    redrawPending = true;
    queueMicrotask(() => {
      redrawPending = false;
      forceRedraw();
    });
  };
  forceRedraw();

  // ─── C2: Reentrancy guard for async input handling ────────────────────
  let processing = false;
  let flashTimeout = null;

  // ─── M4: performInstall declared BEFORE the Promise ───────────────────
  const performInstall = async (opts) => {
    // M1: Spinner redraw interval
    const spinnerInterval = setInterval(forceRedraw, SPINNER_INTERVAL_MS);

    try {
      const { installAgents } = await import('../installer.mjs');

      // C3: Hijack console to prevent display corruption
      console.log = () => {};
      console.error = () => {};
      consoleHijacked = true;

      const agents = state.install.agents;

      for (let i = 0; i < agents.length; i++) {
        // Update progress
        state = {
          ...state,
          install: { ...state.install, progress: i, current: i },
        };
        redraw();

        // Install one agent at a time for progress tracking
        const counts = await installAgents([agents[i]], { force: Boolean(opts.force) });

        // Derive status from counts
        const status = counts.failed > 0 ? 'failed'
          : counts.skipped > 0 ? 'skipped'
          : 'installed';

        state = {
          ...state,
          install: {
            ...state.install,
            progress: i + 1,
            current: i + 1,
            results: [...state.install.results, { name: agents[i].name, status }],
          },
        };
        redraw();
      }

      // Refresh installed set after installation
      const installed = detectInstalled(state.manifest);

      // Done
      state = { ...state, mode: 'done', installed, install: { ...state.install, done: true } };
      redraw();
    } catch (err) {
      state = {
        ...state,
        mode: 'done',
        install: { ...state.install, done: true, error: err.message },
      };
      redraw();
    } finally {
      clearInterval(spinnerInterval);
      console.log = origLog;
      console.error = origError;
      consoleHijacked = false;
    }
  };

  // ─── Promise that resolves when TUI closes ────────────────────────────
  return new Promise((resolve) => {
    // Resize handler
    const unsubResize = onResize((size) => {
      state = { ...state, terminal: size };
      // Adjust scroll to keep cursor in viewport
      const vh = getViewportHeight({ ...state, terminal: size });
      if (state.list.cursor >= state.list.scrollOffset + vh) {
        state = { ...state, list: { ...state.list, scrollOffset: state.list.cursor - vh + 1 } };
      }
      invalidate();
      redraw();
    });

    // Input handler with C2 reentrancy guard
    const unsubInput = onInput(async (data) => {
      if (processing) return;
      processing = true;
      try {
        const parsed = parseKey(data, state.mode);
        if (!parsed || parsed.action === 'NONE') return;

        const newState = update(state, parsed);

        // Quit → cleanup and resolve
        if (newState.mode === 'quit') {
          cleanup();
          resolve();
          return;
        }

        // Transition to installing → run install sequence
        if (newState.mode === 'installing' && state.mode !== 'installing') {
          state = newState;
          redraw();
          const installOpts = state.install?.forceMode ? { force: true } : options;
          await performInstall(installOpts);
          return;
        }

        // Transition to uninstalling → run uninstall sequence
        if (newState.mode === 'uninstalling' && state.mode !== 'uninstalling') {
          state = newState;
          redraw();

          try {
            const { uninstallAgent } = await import('../installer.mjs');
            const target = state.uninstallTarget;
            if (target) {
              const result = uninstallAgent(target.agent, { cwd: process.cwd() });

              // Refresh installed set
              const installed = detectInstalled(state.manifest);

              const flashMsg = result === 'removed'
                ? `✓ Agent "${target.name}" removed`
                : result === 'not_found'
                  ? `Agent "${target.name}" was not found`
                  : `✗ Failed to remove "${target.name}"`;

              state = {
                ...state,
                mode: 'browse',
                installed,
                uninstallTarget: null,
                flash: { message: flashMsg, ts: Date.now() },
              };
              redraw();

              // Auto-clear flash after 3s
              if (flashTimeout) clearTimeout(flashTimeout);
              flashTimeout = setTimeout(() => {
                state = { ...state, flash: null };
                flashTimeout = null;
                redraw();
              }, 3000);
            } else {
              state = { ...state, mode: 'browse', uninstallTarget: null };
              redraw();
            }
          } catch (err) {
            state = {
              ...state,
              mode: 'browse',
              uninstallTarget: null,
              flash: { message: `Error: ${err.message || err}`, ts: Date.now() },
            };
            redraw();
          }
          return;
        }

        state = newState;
        redraw();

        // S5: Auto-clear flash messages after 3 seconds
        if (state.flash) {
          if (flashTimeout) clearTimeout(flashTimeout);
          flashTimeout = setTimeout(() => {
            state = { ...state, flash: null };
            flashTimeout = null;
            redraw();
          }, 3000);
        }
      } finally {
        processing = false;
      }
    });

    // Cleanup function
    const cleanup = () => {
      if (flashTimeout) clearTimeout(flashTimeout);
      unsubResize();
      unsubInput();
      process.off('SIGINT', onSigint);
      process.off('SIGTERM', onSigterm);
      process.off('SIGHUP', onSighup);
      process.removeListener('uncaughtException', onUncaughtException);
      process.removeListener('unhandledRejection', onUnhandledRejection);
      // C3: Restore console if hijacked
      if (consoleHijacked) {
        console.log = origLog;
        console.error = origError;
        consoleHijacked = false;
      }
      exit();
    };

    // S1 + S2: Signal handlers with correct exit codes
    const onSigint = () => {
      cleanup();
      process.exit(130); // 128 + 2 (SIGINT)
    };
    const onSigterm = () => {
      cleanup();
      process.exit(143); // 128 + 15 (SIGTERM)
    };
    const onSighup = () => {
      cleanup();
      process.exit(129); // 128 + 1 (SIGHUP)
    };

    // S1: uncaughtException / unhandledRejection handlers
    const onUncaughtException = (err) => {
      cleanup();
      console.error('Fatal error:', err?.message || err);
      process.exit(1);
    };
    const onUnhandledRejection = (reason) => {
      cleanup();
      console.error('Fatal error:', reason?.message || reason);
      process.exit(1);
    };

    process.on('SIGINT', onSigint);
    process.on('SIGTERM', onSigterm);
    process.on('SIGHUP', onSighup);
    process.on('uncaughtException', onUncaughtException);
    process.on('unhandledRejection', onUnhandledRejection);
  });
}
