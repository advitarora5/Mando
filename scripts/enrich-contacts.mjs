// Fills contact gaps through treg. Two steps, so a paid lookup is never repeated:
//   1. find   node scripts/enrich-contacts.mjs find <domains|contacts|emails> [--limit N] [--budget USD]
//             Looks things up (domains are free; contacts and emails cost money), stops at the budget, and saves
//             var/ingestion/enrich-<mode>-<time>.json. Writes nothing to the database.
//   2. apply  node --env-file=.env.local scripts/enrich-contacts.mjs apply <that file>
//             Writes the saved findings. Fill-only: a field that already has a value is never overwritten.
// Add --report to `find` to print per-company results. Needs `treg login` (uses PYTHONUTF8=1 and the treg on PATH or ~/.local/bin).
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const TREG = process.env.TREG ?? `${homedir()}/.local/bin/treg`;
const squash = value => String(value ?? "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");

function treg(endpoint, { body, query = [], headers = [] }) {
  const args = ["--json", "call", endpoint];
  if (body) args.push("--method", "POST", "--data", JSON.stringify(body));
  for (const q of query) args.push("--query", q);
  for (const h of headers) args.push("--header", h);
  const run = spawnSync(TREG, args, { encoding: "utf8", env: { ...process.env, PYTHONUTF8: "1" }, maxBuffer: 50e6 });
  let parsed;
  try { parsed = JSON.parse(run.stdout); } catch { throw new Error(`treg ${endpoint} gave no JSON: ${(run.stderr || run.stdout).slice(0, 200)}`); }
  return { result: parsed.result, status: parsed._treg?.http_status ?? 0, cost: (parsed._treg?.charged_micro ?? 0) / 1e6 };
}

// ---- pure helpers (tested) ----

/** The company's own domain among Hunter's name matches: exact name, most known emails. Anything looser needs a human. */
export function pickDomain(name, matches) {
  const exact = (matches ?? []).filter(m => squash(m.company_name) === squash(name));
  return exact.sort((a, b) => b.email_count - a.email_count)[0]?.domain ?? null;
}

const SENIOR = [[/\b(chief|chro|cpo)\b/i, 5], [/\b(svp|evp|vp|vice president|head)\b/i, 4], [/\bdirector\b/i, 3], [/\bmanager\b/i, 2]];
// Titles that read as senior but are staff or project roles.
const NOT_A_LEADER = /analyst|associate|specialist|coordinator|consultant|engineer|architect|intern|assistant|generalist|administrator|recruiter|program|project|partner/i;
/** A usable person: whole first and last name (not "Raquel L." or "D J") and a leader's title. */
export const acceptable = (first, last, title) => /^[A-Za-z][A-Za-z'’-]+$/.test(first ?? "") && /^[A-Za-z][A-Za-z'’ -]+$/.test(last ?? "") && (last ?? "").length >= 2 && !NOT_A_LEADER.test(title ?? "") && rank(title ?? "") >= 2;
const SLOTS = {
  hr: /human resources|\bhr\b|people|talent|chro/i,
  hris: /hris|hr (systems|technology|tech|information|applications)|people systems|workday|human capital (system|technology)/i,
  it: /\bit\b|information technology|technology operations|infrastructure|\bcio\b/i,
};
const rank = title => SENIOR.reduce((best, [pattern, points]) => (pattern.test(title) ? Math.max(best, points) : best), 0);

/** Up to three people, one per target role (VP of HR, HRIS lead, IT operations), best seniority first. Juniors never qualify. */
export function pickContacts(leads) {
  const people = (leads ?? []).filter(p => p.profileUrl && acceptable(p.firstname, p.lastname, p.lastJobTitle)).map(p => ({ ...p, points: rank(p.lastJobTitle) }));
  const used = new Set();
  const best = (slot, extra = 0) => {
    const candidates = people.filter(p => !used.has(p.profileUrl) && SLOTS[slot].test(p.lastJobTitle));
    const pick = candidates.sort((a, b) => b.points + (slot === "it" && /operations|infrastructure/i.test(b.lastJobTitle) ? 1 : 0) - (a.points + (slot === "it" && /operations|infrastructure/i.test(a.lastJobTitle) ? 1 : 0)))[0];
    if (pick) used.add(pick.profileUrl);
    return pick && { slot, name: `${pick.firstname} ${pick.lastname}`.trim(), title: pick.lastJobTitle, linkedin_url: pick.profileUrl, first: pick.firstname, last: pick.lastname };
  };
  return [best("hris"), best("hr"), best("it")].filter(Boolean);
}

/** A found address counts only when it is at the company's own domain, so personal mailboxes never pass as work email. */
export const isWorkEmail = (email, domain) => !!email && !!domain && email.toLowerCase().endsWith(`@${domain.toLowerCase()}`) && !/^(placeholder|noreply|no-reply|info|test|example|admin)@/i.test(email);

// ---- database ----
const connect = () => createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
async function all(db, table, order = "id") {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select("*").order(order).range(offset, offset + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}

// ---- find ----
async function find(mode, args) {
  const opt = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const limit = Number(opt("--limit") ?? 10), budget = Number(opt("--budget") ?? 0.1), report = args.includes("--report");
  const db = connect();
  const [companies, contacts] = await Promise.all([all(db, "companies"), all(db, "contacts")]);
  const byCompany = Map.groupBy(contacts, c => c.company_id);
  const demo = c => /^d0000000-/.test(c.id);
  const out = { mode, found_at: new Date().toISOString(), spent: 0, items: [] };
  const room = () => out.spent < budget;
  const spend = r => { out.spent += r.cost; return r; };

  if (mode === "domains") {
    for (const c of companies.filter(c => !c.domain && !demo(c)).slice(0, limit)) {
      const found = pickDomain(c.name, treg("hunter.x.domain-finder", { query: [`company=${c.name}`, "limit=10"] }).result?.data);
      out.items.push({ company_id: c.id, name: c.name, domain: found });
    }
  } else if (mode === "contacts") {
    // Companies with a domain and no contact yet: 2 searches (HR/HRIS, IT), then a work-email lookup for each pick.
    const targets = companies.filter(c => c.domain && !demo(c) && !(byCompany.get(c.id)?.length)).slice(0, limit);
    for (const c of targets) {
      if (!room()) { out.stopped = "budget reached"; break; }
      const search = (titles, size) => spend(treg("icypeas.people.search", { body: { query: { currentCompanyWebsite: { include: [c.domain] }, currentJobTitle: { include: titles } }, pagination: { size } }, headers: ["X-Treg-Route-Max-Cost: 0.02"] })).result?.leads ?? [];
      const leads = [...search(["Human Resources", "HRIS", "HR Systems", "People"], 15), ...search(["IT Operations", "Information Technology"], 8)];
      const picks = pickContacts(leads);
      for (const p of picks) {
        if (!room()) break;
        const find = spend(treg("treg.people.email.find", { body: { domain: c.domain, first_name: p.first, last_name: p.last }, headers: ["X-Treg-Route-Max-Cost: 0.02"] }));
        const email = find.result?.output?.email;
        if (isWorkEmail(email, c.domain)) {
          const check = treg("treg.people.email.verify", { body: { email } });
          p.email = email; p.email_verified = check.result?.output?.valid === true || check.result?.output?.status === "valid"; spend(check);
        }
      }
      out.items.push({ company_id: c.id, name: c.name, domain: c.domain, picks });
    }
  } else if (mode === "emails") {
    // Existing contacts that have a name and a company domain but no email.
    const domainOf = new Map(companies.map(c => [c.id, c.domain]));
    for (const p of contacts.filter(p => !p.email && domainOf.get(p.company_id) && p.name.trim().includes(" ")).slice(0, limit)) {
      if (!room()) { out.stopped = "budget reached"; break; }
      const domain = domainOf.get(p.company_id), [first, ...rest] = p.name.trim().split(/\s+/);
      const email = spend(treg("treg.people.email.find", { body: { domain, first_name: first, last_name: rest.join(" ") }, headers: ["X-Treg-Route-Max-Cost: 0.02"] })).result?.output?.email;
      const item = { contact_id: p.id, name: p.name, domain, email: null, email_verified: false };
      if (isWorkEmail(email, domain)) {
        const check = spend(treg("treg.people.email.verify", { body: { email } }));
        item.email = email; item.email_verified = check.result?.output?.valid === true || check.result?.output?.status === "valid";
      }
      out.items.push(item);
    }
  } else throw new Error("mode must be domains, contacts or emails");

  await mkdir(new URL("../var/ingestion/", import.meta.url), { recursive: true });
  const file = new URL(`../var/ingestion/enrich-${mode}-${out.found_at.replace(/[:.]/g, "-")}.json`, import.meta.url);
  await writeFile(file, JSON.stringify(out, null, 2));
  const hit = out.items.filter(i => i.domain || i.picks?.length || i.email).length;
  console.log(`${mode}: ${out.items.length} looked at, ${hit} with findings, spent $${out.spent.toFixed(4)} of $${budget}${out.stopped ? ` (${out.stopped})` : ""}.`);
  if (mode === "contacts") {
    const people = out.items.flatMap(i => i.picks);
    console.log(`contacts found ${people.length}; work emails ${people.filter(p => p.email).length} (verified ${people.filter(p => p.email_verified).length}); LinkedIn URLs ${people.length}`);
  }
  if (report) console.log(JSON.stringify(out.items, null, 2));
  console.log(`Saved ${file.pathname.replace(/^\/(\w:)/, "$1")}`);
}

// ---- apply ----
async function apply(path) {
  const saved = JSON.parse(await readFile(path, "utf8"));
  const db = connect();
  let wrote = 0;
  const upd = async (table, id, patch, key = "id") => {
    const { error } = await db.from(table).update(patch).eq(key, id);
    if (error) throw new Error(`${table}: ${error.message}`);
    wrote++;
  };
  if (saved.mode === "domains") {
    for (const i of saved.items.filter(i => i.domain)) { // guarded: only fills a still-empty domain
      const { data } = await db.from("companies").select("domain").eq("id", i.company_id).single();
      if (!data?.domain) await upd("companies", i.company_id, { domain: i.domain });
    }
  } else if (saved.mode === "contacts") {
    for (const item of saved.items) for (const p of item.picks) {
      if (!acceptable(p.first, p.last, p.title)) continue; // findings saved under older rules are re-checked here
      if (p.email && !isWorkEmail(p.email, item.domain)) delete p.email;
      const { data: dupe } = await db.from("contacts").select("id").eq("company_id", item.company_id).eq("linkedin_url", p.linkedin_url);
      if (dupe?.length) continue;
      const row = { company_id: item.company_id, name: p.name, title: p.title, linkedin_url: p.linkedin_url, source: p.linkedin_url };
      if (p.email) Object.assign(row, { email: p.email, email_verified: p.email_verified, email_source: p.linkedin_url });
      const { error } = await db.from("contacts").insert(row);
      if (error) throw new Error(`contacts: ${error.message}`);
      wrote++;
    }
  } else if (saved.mode === "emails") {
    for (const i of saved.items.filter(i => i.email)) {
      const { data } = await db.from("contacts").select("email").eq("id", i.contact_id).single();
      if (!data?.email) await upd("contacts", i.contact_id, { email: i.email, email_verified: i.email_verified });
    }
  }
  console.log(`Applied ${saved.mode}: ${wrote} database write(s). Existing values were left alone.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, arg, ...rest] = process.argv.slice(2);
  if (command === "find") await find(arg, rest);
  else if (command === "apply") await apply(arg);
  else console.error("Usage: scripts/enrich-contacts.mjs find <domains|contacts|emails> [--limit N] [--budget USD] [--report]\n       scripts/enrich-contacts.mjs apply <saved findings file>");
}
