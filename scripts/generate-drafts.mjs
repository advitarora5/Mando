// Drafts a LinkedIn message and an email per contact from stored evidence. Dry run by default: review the printout, then add --apply. --only=<text> limits to company names containing <text>.
// Same LLM setup as generate-insights.mjs (local Ollama by default). Hand-edited drafts and drafts already sent are never overwritten; contacts that already have drafts are skipped unless --force.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { buildDraftPrompt, parseDrafts, pickTrigger } from "../src/domain/outreach/draft.ts";

const angles = JSON.parse(readFileSync(new URL("../src/data/outreach/angles.json", import.meta.url), "utf8"));
const { SUPABASE_URL, SUPABASE_SECRET_KEY, LLM_API_KEY = "ollama", LLM_BASE_URL = "http://localhost:11434/v1", LLM_MODEL = "llama3.1" } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Configure database credentials in .env.local first.");
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).toLowerCase();
const apply = process.argv.includes("--apply"), force = process.argv.includes("--force");
const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await db.from("companies").select("*, contacts(id, name, title, outreach_drafts(channel, edited, sent_at)), scores(*), company_insights(why_now_generated, why_now_override)");
if (error) throw new Error(error.message);

for (const c of data) {
  if (only && !c.name.toLowerCase().includes(only)) continue;
  const score = c.scores.sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))[0];
  if (!score) continue;
  const insight = [c.company_insights].flat()[0];
  const company = { ...c, score, why_now: insight?.why_now_override ?? insight?.why_now_generated ?? null };
  const trigger = pickTrigger(company);
  for (const contact of c.contacts) {
    const existing = contact.outreach_drafts ?? [];
    if (existing.some((d) => d.edited || d.sent_at)) { console.log(`\n${c.name} / ${contact.name}: kept (edited or sent)`); continue; }
    if (existing.length && !force) continue;
    try {
      const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${LLM_API_KEY}` },
        body: JSON.stringify({ model: LLM_MODEL, temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: "user", content: buildDraftPrompt(company, contact, trigger, angles[trigger]) }] }),
      }).catch(() => { throw new Error(`cannot reach ${LLM_BASE_URL}. Is Ollama running?`); });
      if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
      const drafts = parseDrafts((await res.json()).choices[0].message.content);
      console.log(`\n${c.name} / ${contact.name} (${contact.title ?? "no title"}) [${trigger}]`);
      for (const d of drafts) console.log(`  ${d.channel}${d.subject ? ` - ${d.subject}` : ""}\n    ${d.body.replace(/\n/g, "\n    ")}`);
      if (apply) {
        const rows = drafts.map((d) => ({ contact_id: contact.id, company_id: c.id, channel: d.channel, subject: d.subject, body: d.body, trigger, generated_at: new Date().toISOString() }));
        const { error } = await db.from("outreach_drafts").upsert(rows, { onConflict: "contact_id,channel" });
        if (error) throw new Error(error.message);
      }
    } catch (e) { console.error(`\n${c.name} / ${contact.name}: SKIPPED - ${e.message}`); }
  }
}
if (!apply) console.log("\nDry run. Nothing saved; re-run with --apply after spot-checking.");
