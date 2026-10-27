// Candidate websites from Wikidata (free, keyless): the official website (P856) of entities whose English label starts with the
// company name. It only proposes domains; every one still has to pass the page-identity check and the Workday-link proof in website.ts.
import { normalizeDomain, normalizeName } from "../domain/ingestion/normalize.ts";
import type { PipelineContext } from "./types.ts";

const API = "https://www.wikidata.org/w/api.php";

// Wikidata answers 429 above about one request per second; two seconds apart, with backoff, stays under it.
async function get(ctx: PipelineContext, params: Record<string, string>): Promise<any | null> {
  const url = `${API}?${new URLSearchParams({ format: "json", ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    await ctx.sleep(2000);
    try {
      const res = await ctx.fetch(url, { headers: { "user-agent": `mando-cube-ingestion/1.0 (${ctx.contact || "contact unset"})`, accept: "application/json" } });
      if (res.status === 429) { await ctx.sleep(5000 * (attempt + 1)); continue; }
      return res.ok ? await res.json() : null;
    } catch { return null; }
  }
  return null;
}

export async function wikidataDomains(ctx: PipelineContext, name: string, max = 3): Promise<string[]> {
  const target = normalizeName(name);
  if (target.length < 3) return [];
  const found = await get(ctx, { action: "wbsearchentities", search: name, language: "en", limit: "5" });
  const ids: string[] = (found?.search ?? []).map((entity: { id: string }) => entity.id).slice(0, 5);
  if (!ids.length) return [];
  const data = await get(ctx, { action: "wbgetentities", ids: ids.join("|"), props: "claims|labels", languages: "en" });
  const domains: string[] = [];
  for (const id of ids) {
    const entity = data?.entities?.[id];
    if (!normalizeName(entity?.labels?.en?.value).startsWith(target)) continue;
    for (const claim of entity?.claims?.P856 ?? []) {
      const value = claim?.mainsnak?.datavalue?.value;
      if (typeof value !== "string") continue;
      try { const domain = normalizeDomain(new URL(value).hostname); if (domain && !domains.includes(domain)) domains.push(domain); } catch { /* not a URL */ }
    }
  }
  return domains.slice(0, max);
}
