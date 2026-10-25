// Free candidate lookup + independent, reciprocal Workday-site confirmation. No LLM or paid fallback.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createHash } from "node:crypto";
import { normalizeDomain, normalizeName } from "../domain/ingestion/normalize.ts";
import { parseRobots, robotsAllows } from "./http.ts";
import type { PipelineContext, WebsiteResolution, WorkdaySite } from "./types.ts";

export const WEBSITE_VERSION = 1;
export const WEBSITE_LIMIT = 50;
const DAY = 86400000;
const MAX_BODY = 512 * 1024;

// Candidate URLs and every redirect are checked before fetching. IPs and private DNS answers are refused.
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && (b === 168 || b === 0)) && !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && (b === 18 || b === 19));
  }
  // Only globally routed IPv6 unicast; reject embedded IPv4 and transition ranges too.
  return isIP(address) === 6 && /^[23][0-9a-f]{0,3}:/i.test(address) && !/^2002:/i.test(address) && !/^2001:(?:db8|0):/i.test(address) && !address.includes(".");
}
function safeUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !normalizeDomain(url.hostname) || isIP(url.hostname) || /\.(local|localhost|internal|home|arpa)$/i.test(url.hostname)) throw Error("unsafe website URL");
  return url;
}

export class WebsiteHttp {
  requests = 0;
  private robots = new Map<string, string>();
  private last = new Map<string, number>();
  private ctx: PipelineContext;
  private maxRequests: number;
  constructor(ctx: PipelineContext, maxRequests = 300) { this.ctx = ctx; this.maxRequests = maxRequests; }
  private async read(url: URL): Promise<{ status: number; body: string; location: string | null; type: string }> {
    const addresses = await (this.ctx.lookupHost ?? (host => lookup(host, { all: true })))(url.hostname);
    if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw Error("website resolves to a non-public address");
    if (this.requests >= this.maxRequests) throw Error("website request cap reached");
    const wait = (this.last.get(url.hostname) ?? 0) + 1000 - this.ctx.now().getTime();
    if (wait > 0) await this.ctx.sleep(wait);
    this.requests++; this.last.set(url.hostname, this.ctx.now().getTime());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await this.ctx.fetch(url.href, { redirect: "manual", signal: controller.signal, headers: { "user-agent": `mando-cube-ingestion/1.0 (${this.ctx.contact || "contact unset"})`, accept: "text/html,text/plain;q=0.9" } });
      const reader = res.body?.getReader();
      const chunks: Uint8Array[] = []; let bytes = 0;
      if (reader) try {
        while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > MAX_BODY) throw Error("website response exceeds size limit"); chunks.push(value); }
      } finally { void reader.cancel().catch(() => {}); }
      return { status: res.status, body: Buffer.concat(chunks).toString("utf8"), location: res.headers.get("location"), type: res.headers.get("content-type") ?? "" };
    } finally { clearTimeout(timer); }
  }
  async page(value: string): Promise<{ url: string; html: string }> {
    let url = safeUrl(value);
    for (let hop = 0; hop <= 3; hop++) {
      let robots = this.robots.get(url.origin);
      if (robots === undefined) {
        const res = await this.read(new URL("/robots.txt", url));
        if (res.status === 404 || res.status === 410) robots = "";
        else if (res.status === 200 && !/<html|captcha|cf-chl-/i.test(res.body)) robots = res.body;
        else throw Error(`website robots unavailable: HTTP ${res.status}`);
        this.robots.set(url.origin, robots);
      }
      if (!robotsAllows(parseRobots(robots, "mando-cube-ingestion"), url.pathname + url.search)) throw Error("website disallowed by robots.txt");
      const res = await this.read(url);
      if (res.status >= 300 && res.status < 400 && res.location) { url = safeUrl(new URL(res.location, url).href); continue; }
      if (res.status !== 200) throw Error(`website HTTP ${res.status}`);
      if (!/text\/html|application\/xhtml\+xml/i.test(res.type) || /captcha|cf-chl-|challenge-platform|verify you are human/i.test(res.body.slice(0, 20000))) throw Error("website is not readable HTML");
      return { url: url.href, html: res.body };
    }
    throw Error("website redirect limit reached");
  }
}

const decode = (value: string) => value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&nbsp;/gi, " ");
const attr = (tag: string, key: string) => decode(tag.match(new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find(v => v !== undefined) ?? "");
export function links(html: string, base: string): { url: URL; label: string }[] {
  const out: { url: URL; label: string }[] = [];
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = attr(match[1], "href"); if (!href) continue;
    try { const url = new URL(href, base); if (url.protocol === "https:") out.push({ url, label: decode(match[2].replace(/<[^>]+>/g, " ")).trim() }); } catch { /* not a URL */ }
  }
  return out;
}
export function pageIdentity(html: string, name: string): string | null {
  const target = normalizeName(name); if (!target) return null;
  const names: string[] = [];
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) if (/^(og:site_name|application-name)$/i.test(attr(match[0], "property") || attr(match[0], "name"))) names.push(attr(match[0], "content"));
  for (const match of html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)) names.push(...decode(match[1]).split(/\s*[|–—]\s*|\s+-\s+/));
  // Only structured Organization identity, not arbitrary body mentions or a single distinctive word.
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (v: unknown, depth = 0) => { if (depth > 8 || !v || typeof v !== "object") return; if (Array.isArray(v)) { v.forEach(x => walk(x, depth + 1)); return; } const row = v as Record<string, unknown>; if ([row["@type"]].flat().includes("Organization")) for (const key of ["name", "legalName"]) if (typeof row[key] === "string") names.push(row[key]); if (row["@graph"]) walk(row["@graph"], depth + 1); }; walk(JSON.parse(match[1]));
    } catch { /* broken structured data is not evidence */ }
  }
  return names.find(value => normalizeName(value.replace(/<[^>]+>/g, " ")) === target) ?? null;
}
function workdayLink(html: string, base: string, sites: WorkdaySite[]): string | null {
  return links(html, base).find(({ url }) => sites.some(site => url.hostname === `${site.tenant}.${site.pod}.myworkdayjobs.com` && decodeURIComponent(url.pathname).split("/").includes(site.site)))?.url.href ?? null;
}
export function websiteSignature(sites: WorkdaySite[]): string {
  return createHash("sha256").update(JSON.stringify([WEBSITE_VERSION, sites.map(s => `${s.tenant}.${s.pod}/${s.site}`).sort()])).digest("hex");
}

export async function resolveWebsite(ctx: PipelineContext, name: string, sites: WorkdaySite[], http: WebsiteHttp, dryRun = false): Promise<WebsiteResolution> {
  const normalized = normalizeName(name), signature = websiteSignature(sites);
  const cached = await ctx.store.websiteResolution(normalized);
  if (cached?.input_signature === signature && Date.parse(cached.next_check_at) > ctx.now().getTime()) return cached;
  const checked = ctx.now();
  const base: WebsiteResolution = { normalized_name: normalized, company_name: name, domain: null, status: "unresolved", reason: "no matching Workday site available for reciprocal confirmation", input_signature: signature, checked_at: checked.toISOString(), next_check_at: new Date(+checked + 7 * DAY).toISOString(), evidence: { candidates: [], checks: [] } };
  if (!ctx.treg) return { ...base, reason: "Treg is not configured" }; // do not cache disabled configuration
  if (!sites.length) { if (!dryRun) await ctx.store.saveWebsiteResolution(base); return base; }
  try {
    const res = await ctx.treg.call("hunter.x.domain-finder", { query: { company: name.replace(/\s*\/[A-Z]{2}\/?\s*$/, "").trim(), limit: 3 }, headers: { "X-Treg-Route-Max-Cost": "0", "X-Treg-Route-Waterfall": "0" }, timeoutMs: 15000 });
    if (res.cost_usd > 0) await ctx.spend.record({ provider: "treg", endpoint: "hunter.x.domain-finder", step: "domain", subject: name, idempotency_key: "", worst_case_usd: 0, cost_usd: res.cost_usd, outcome: "unexpected charge on a free endpoint" });
    if (!Number.isFinite(res.cost_usd) || res.cost_usd !== 0) throw Error("domain lookup did not report a zero charge");
    if (!res.ok) throw Error(res.error);
    const data = (res.body as { data?: unknown })?.data;
    if (!Array.isArray(data) || data.some(row => !row || typeof row !== "object" || typeof row.domain !== "string" || typeof row.company_name !== "string")) throw Error("domain lookup returned malformed data");
    const candidates = data.slice(0, 3) as { domain: string; company_name: string }[];
    base.evidence.candidates = candidates;
    const confirmed = new Set<string>(); let failures = 0;
    for (const candidate of candidates) {
      if (normalizeName(candidate.company_name) !== normalized) continue;
      const domain = normalizeDomain(candidate.domain); if (!domain) continue;
      try {
        safeUrl(candidate.domain.includes("://") ? candidate.domain : `https://${candidate.domain}/`);
        const home = await http.page(`https://${domain}/`);
        const identity = pageIdentity(home.html, name);
        if (!identity) { base.evidence.checks.push({ domain, url: home.url, reason: "no exact company identity in page metadata" }); continue; }
        let proof = workdayLink(home.html, home.url, sites); let proofUrl = home.url;
        if (!proof) {
          const career = links(home.html, home.url).find(link => normalizeDomain(link.url.hostname) === normalizeDomain(new URL(home.url).hostname) && /careers?|jobs|join (our|the) team/i.test(`${link.label} ${link.url.pathname}`));
          if (career && career.url.href !== home.url) { const page = await http.page(career.url.href); if (normalizeDomain(new URL(page.url).hostname) === normalizeDomain(new URL(home.url).hostname)) { proof = workdayLink(page.html, page.url, sites); proofUrl = page.url; } }
        }
        base.evidence.checks.push({ domain, url: proofUrl, identity, workday_url: proof, reason: proof ? "company identity and reciprocal Workday career link" : "no reciprocal link to observed Workday career site" });
        if (proof) confirmed.add(normalizeDomain(new URL(home.url).hostname)!);
      } catch (error) { failures++; base.evidence.checks.push({ domain, reason: (error as Error).message }); }
    }
    // An unreadable competing candidate can conceal a second valid identity; don't pick a winner.
    if (confirmed.size === 1 && failures === 0) { base.domain = [...confirmed][0]; base.status = "confirmed"; base.reason = "independent company identity and reciprocal Workday career link"; base.next_check_at = new Date(+checked + 30 * DAY).toISOString(); }
    else if (failures) { base.status = "error"; base.reason = "one or more website checks failed; retry required"; }
    else base.reason = confirmed.size > 1 ? "multiple websites corroborate this company; human review required" : "no uniquely corroborated website";
  } catch (error) { base.status = "error"; base.reason = (error as Error).message; }
  if (base.status === "error") base.next_check_at = new Date(+checked + DAY).toISOString();
  if (!dryRun) await ctx.store.saveWebsiteResolution(base);
  return base;
}
