// Demo fixtures are for a local Supabase instance only. Never target a shared/cloud database.
export function assertLocalDemoSeedTarget(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Demo seeding requires a local SUPABASE_URL, such as http://127.0.0.1:54321.");
  }
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!loopback.has(url.hostname) || !["http:", "https:"].includes(url.protocol)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Demo seeding is local-only. Shared and cloud Supabase projects are blocked; no demo data was written.");
  }
  return url.origin;
}
