import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ─── ESM import smoke tests ────────────────────────────────────────────────

describe("registry module exports", () => {
  it("should import registry functions", async () => {
    const registry = await import("../../src/registry.mjs");

    for (const name of ["searchAgents", "getAgent", "loadManifest"] as const) {
      assert.equal(
        typeof registry[name],
        "function",
        `Expected ${name} to be a function`,
      );
    }
  });
});

describe("lock module exports", () => {
  it("should import lock functions", async () => {
    const lock = await import("../../src/lock.mjs");

    for (const name of ["detectAgentStates", "verifyLockIntegrity"] as const) {
      assert.equal(
        typeof lock[name],
        "function",
        `Expected ${name} to be a function`,
      );
    }
  });
});

describe("manifest loading", () => {
  it("should load manifest successfully", async () => {
    const { loadManifest } = await import("../../src/registry.mjs");
    const manifest = loadManifest();

    assert.equal(typeof manifest, "object", "Manifest should be an object");
    assert.ok(manifest !== null, "Manifest should not be null");

    assert.equal(
      typeof manifest.version,
      "string",
      "Expected version to be a string",
    );
    assert.ok(
      Array.isArray(manifest.agents),
      "Expected agents to be an array",
    );
    assert.ok(manifest.agents.length > 0, "Expected at least one agent");

    assert.equal(
      typeof manifest.categories,
      "object",
      "Expected categories to be an object",
    );
    assert.ok(
      Object.keys(manifest.categories).length > 0,
      "Expected at least one category",
    );

    assert.equal(
      typeof manifest.packs,
      "object",
      "Expected packs to be an object",
    );
    assert.ok(
      Object.keys(manifest.packs).length > 0,
      "Expected at least one pack",
    );
  });
});
