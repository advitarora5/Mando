import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertLocalDemoSeedTarget } from "../scripts/demo-seed-target.mjs";

test("local Supabase addresses remain usable for fictional fixtures", () => {
  for (const url of ["http://127.0.0.1:54321", "http://localhost:54321/", "http://[::1]:54321"]) {
    assert.equal(assertLocalDemoSeedTarget(url), new URL(url).origin);
  }
});

test("shared projects, cloud targets and misleading localhost addresses are blocked", () => {
  for (const url of [
    "https://fkhychihxpregusklggo.supabase.co", "https://test-project.supabase.co",
    "https://localhost.example.com", "http://localhost@fkhychihxpregusklggo.supabase.co",
    "http://127.0.0.1.example.com", "http://127.0.0.1:54321/rest/v1",
    "http://localhost:54321?target=production", "http://localhost:54321/#production",
    "file://localhost/database", undefined, "not a URL",
  ]) {
    assert.throws(() => assertLocalDemoSeedTarget(url));
  }
});

test("the real seed command exits on a shared target before loading the database client", () => {
  const script = fileURLToPath(new URL("../scripts/seed-demo.mjs", import.meta.url));
  const run = spawnSync(process.execPath, [script], {
    env: { ...process.env, SUPABASE_URL: "https://fkhychihxpregusklggo.supabase.co", SUPABASE_SECRET_KEY: "" },
    encoding: "utf8",
  });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Demo seeding is local-only/);
  assert.doesNotMatch(run.stderr, /Configure database credentials|ERR_MODULE_NOT_FOUND/);
  assert.equal(run.stdout, "");
});
