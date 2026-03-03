/// <reference path="../../plugin/types.d.ts" />

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  search_agents,
  list_agents,
  get_agent,
  check_health,
  sanitizeError,
} from "../../plugin/tools.ts";

// ─── helpers ────────────────────────────────────────────────────────────────

type ToolContext = Parameters<typeof search_agents.execute>[1];

function makeCtx(directory: string): ToolContext {
  return {
    sessionID: "test",
    messageID: "test",
    agent: "test",
    directory,
    worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  };
}

/** Project root — where manifest.json lives. */
const PROJECT_DIR = process.cwd();

// ─── search_agents ──────────────────────────────────────────────────────────

describe("search_agents", () => {
  it("should find agents by technology name", async () => {
    const result = await search_agents.execute(
      { query: "react" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(result.startsWith("Found"), `Expected "Found…", got: ${result.slice(0, 80)}`);
    assert.ok(
      result.includes("react-specialist"),
      `Expected "react-specialist" in results:\n${result}`,
    );
  });

  it("should return helpful message for no results", async () => {
    const result = await search_agents.execute(
      { query: "zzz-nonexistent-zzz" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("No agents found"),
      `Expected "No agents found" in: ${result}`,
    );
  });

  it("should handle empty query gracefully", async () => {
    // Empty string → searchAgents returns [] → "No agents found" message.
    // The key assertion: it must NOT throw.
    const result = await search_agents.execute(
      { query: "" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(typeof result === "string", "Expected a string result");
    assert.ok(!result.startsWith("Error:"), `Unexpected error: ${result}`);
  });
});

// ─── list_agents ────────────────────────────────────────────────────────────

describe("list_agents", () => {
  it("should list all agents grouped by category without filter", async () => {
    const result = await list_agents.execute({}, makeCtx(PROJECT_DIR));

    assert.ok(
      result.includes("Agent Registry"),
      `Expected "Agent Registry" in overview:\n${result.slice(0, 200)}`,
    );
    // At least a few category icons should appear (manifest has 10 categories)
    const icons = ["💻", "🤖", "🌐", "🛠️", "🔒"];
    const found = icons.filter((i) => result.includes(i));
    assert.ok(
      found.length >= 3,
      `Expected at least 3 category icons, found ${found.length}: ${found.join(", ")}`,
    );
  });

  it("should filter by category", async () => {
    const result = await list_agents.execute(
      { category: "web" },
      makeCtx(PROJECT_DIR),
    );

    // Category header should be present
    assert.ok(
      result.includes("🌐") || result.includes("Web"),
      `Expected web category header in:\n${result.slice(0, 200)}`,
    );
    // Should contain known web agents
    assert.ok(
      result.includes("accessibility") || result.includes("react-specialist"),
      `Expected web agents in result:\n${result}`,
    );
    // Must NOT include agents from other categories (spot-check)
    assert.ok(
      !result.includes("python-pro"),
      "Should not include non-web agent python-pro",
    );
  });

  it("should filter by pack", async () => {
    const result = await list_agents.execute(
      { pack: "fullstack" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("Pack:"),
      `Expected "Pack:" in result:\n${result.slice(0, 200)}`,
    );
    assert.ok(
      result.includes("typescript-pro"),
      `Expected "typescript-pro" in fullstack pack:\n${result}`,
    );
  });

  it("should error when both category and pack are provided", async () => {
    const result = await list_agents.execute(
      { category: "web", pack: "fullstack" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("Cannot filter by both"),
      `Expected dual-filter error, got:\n${result}`,
    );
  });

  it("should error for unknown category", async () => {
    const result = await list_agents.execute(
      { category: "nonexistent" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("not found"),
      `Expected "not found" in:\n${result}`,
    );
    // Should list available categories
    assert.ok(
      result.includes("web") && result.includes("ai"),
      `Expected available categories listed in:\n${result}`,
    );
  });

  it("should error for unknown pack", async () => {
    const result = await list_agents.execute(
      { pack: "nonexistent" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("not found"),
      `Expected "not found" in:\n${result}`,
    );
    // Should list available packs
    assert.ok(
      result.includes("fullstack") && result.includes("frontend"),
      `Expected available packs listed in:\n${result}`,
    );
  });
});

// ─── get_agent ──────────────────────────────────────────────────────────────

describe("get_agent", () => {
  it("should return agent details for valid name", async () => {
    const result = await get_agent.execute(
      { name: "typescript-pro" },
      makeCtx(PROJECT_DIR),
    );

    for (const field of ["Category:", "Mode:", "Tags:"]) {
      assert.ok(
        result.includes(field),
        `Expected "${field}" in agent details:\n${result}`,
      );
    }
    assert.ok(
      result.includes("typescript-pro"),
      `Expected agent name in output:\n${result}`,
    );
  });

  it("should suggest alternatives for typo", async () => {
    // "typescript-pr" is a plausible typo (forgot the "o") — the substring
    // search in searchAgents will still match "typescript-pro" so the
    // "Did you mean" branch triggers.
    const result = await get_agent.execute(
      { name: "typescript-pr" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("not found"),
      `Expected "not found" for typo:\n${result}`,
    );
    assert.ok(
      result.includes("Did you mean"),
      `Expected "Did you mean" suggestion:\n${result}`,
    );
    assert.ok(
      result.includes("typescript-pro"),
      `Expected "typescript-pro" as suggestion:\n${result}`,
    );
  });

  it("should handle completely unknown name", async () => {
    const result = await get_agent.execute(
      { name: "zzz-nothing-zzz" },
      makeCtx(PROJECT_DIR),
    );

    assert.ok(
      result.includes("not found"),
      `Expected "not found" for unknown agent:\n${result}`,
    );
  });
});

// ─── check_health ───────────────────────────────────────────────────────────

describe("check_health", () => {
  it("should return health report", async () => {
    const result = await check_health.execute({}, makeCtx(PROJECT_DIR));

    assert.ok(
      result.includes("Health Report"),
      `Expected "Health Report" in:\n${result.slice(0, 200)}`,
    );
    assert.ok(
      result.includes("Summary:"),
      `Expected "Summary:" in:\n${result.slice(0, 400)}`,
    );
    assert.ok(
      result.includes("Integrity:"),
      `Expected "Integrity:" in:\n${result}`,
    );
  });

  it("should handle empty directory gracefully", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "health-test-"));
    try {
      const result = await check_health.execute({}, makeCtx(tmpDir));

      assert.ok(typeof result === "string", "Expected string result");
      assert.ok(
        result.includes("Summary:"),
        `Expected "Summary:" even for empty dir:\n${result}`,
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should not throw when manifest.json is missing (error boundary)", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "health-no-manifest-"));
    try {
      // Call check_health pointing at a directory with NO manifest.json.
      // The error boundary (try/catch) should prevent any throw.
      const result = await check_health.execute({}, makeCtx(tmpDir));

      assert.ok(typeof result === "string", "Expected string result, not a throw");
      assert.ok(
        result.includes("Error") || result.includes("Health Report"),
        `Expected either an "Error" message or a "Health Report" with zeros, got:\n${result}`,
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ─── sanitizeError ──────────────────────────────────────────────────────────

describe("sanitizeError", () => {
  it("should strip Unix absolute paths", () => {
    const result = sanitizeError(
      new Error("Failed at /Users/david/Git/project/src/file.ts"),
    );

    assert.ok(
      result.includes("…/"),
      `Expected "…/" replacement in: ${result}`,
    );
    assert.ok(
      !result.includes("/Users/"),
      `Should not contain original path "/Users/" in: ${result}`,
    );
  });

  it("should strip Windows absolute paths", () => {
    const result = sanitizeError(
      new Error("Failed at C:\\Users\\david\\project\\src\\file.ts"),
    );

    assert.ok(
      result.includes("…\\"),
      `Expected "…\\\\" replacement in: ${result}`,
    );
    assert.ok(
      !result.includes("C:\\Users"),
      `Should not contain original path "C:\\\\Users" in: ${result}`,
    );
  });

  it("should strip UNC paths", () => {
    const result = sanitizeError(
      new Error("Failed at \\\\server\\share\\path\\file"),
    );

    assert.ok(
      result.includes("…\\"),
      `Expected "…\\\\" replacement in: ${result}`,
    );
    assert.ok(
      !result.includes("\\\\server"),
      `Should not contain original UNC path "\\\\\\\\server" in: ${result}`,
    );
  });

  it("should pass through messages without paths unchanged", () => {
    const msg = "Simple error without paths";
    const result = sanitizeError(new Error(msg));

    assert.strictEqual(result, msg, "Message without paths should be unchanged");
  });

  it("should handle non-Error input and still strip paths", () => {
    const result = sanitizeError("string error /home/user/deep/path/file");

    assert.ok(
      result.includes("…/"),
      `Expected "…/" replacement for string input: ${result}`,
    );
    assert.ok(
      !result.includes("/home/user"),
      `Should not contain original path "/home/user" in: ${result}`,
    );
  });
});
