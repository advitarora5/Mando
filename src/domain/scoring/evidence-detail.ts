import { parseEvidence } from "./evidence.ts";

// Render-time reading of a stored evidence string. The stored text is never rewritten:
// anything this parser cannot structure stays available as `raw`.
export type AssessmentStatus = "met" | "not_met" | "unknown" | "partial";
export type Subscore = { label: string; points: number; max: number | null; note: string | null };
export type EvidenceDetail = {
  source: string | null;
  reason: string;
  assessment_status: AssessmentStatus | null;
  missing: string[];
  additional_sources: string[];
  subscores: Subscore[];
  cap: number | null;
  raw: string;
  structured: boolean;
};

const OPEN = "\u0001", CLOSE = "\u0002";
const categoryWord = /^(?:Authority|Reachability|Budget|Release|Timing)\s+/i;

// Parenthesised notes can contain periods and "+" signs, so they are masked before splitting.
function mask(text: string) {
  const notes: string[] = [];
  let out = "", depth = 0, current = "";
  for (const char of text) {
    if (char === "(") { if (depth++ === 0) { current = ""; continue; } }
    else if (char === ")" && depth > 0) { if (--depth === 0) { out += `${OPEN}${notes.push(current.trim()) - 1}${CLOSE}`; continue; } }
    if (depth > 0) current += char; else out += char;
  }
  if (depth > 0) out += `(${current}`; // unbalanced: keep the text as written
  return { masked: out, notes };
}
const unmask = (text: string, notes: string[]) => text.replace(new RegExp(`${OPEN}(\\d+)${CLOSE}`, "g"), (_, i) => `(${notes[Number(i)]})`);

function parseTerm(term: string, notes: string[]): Subscore | null {
  const t = term.trim();
  const noteMatch = t.match(new RegExp(`\\s*${OPEN}(\\d+)${CLOSE}\\s*$`));
  const note = noteMatch ? notes[Number(noteMatch[1])] : null;
  const body = noteMatch ? t.slice(0, noteMatch.index).trim() : t;
  const labelFirst = body.match(/^(.*?[A-Za-z].*?)\s+(\d+(?:\.\d+)?)(?:\/(\d+))?$/);
  if (labelFirst) return { label: labelFirst[1].replace(categoryWord, "").replace(/:$/, "").trim(), points: Number(labelFirst[2]), max: labelFirst[3] ? Number(labelFirst[3]) : null, note };
  const numberFirst = body.replace(categoryWord, "").match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?\s+(.*[A-Za-z].*)$/);
  if (numberFirst) return { label: numberFirst[3].trim(), points: Number(numberFirst[1]), max: numberFirst[2] ? Number(numberFirst[2]) : null, note };
  return null;
}

function extractSubscores(text: string) {
  const { masked, notes } = mask(text);
  const plus = masked.indexOf(" + ");
  if (plus < 0) return { subscores: [] as Subscore[], cap: null, rest: text };
  const boundary = Math.max(masked.lastIndexOf(". ", plus), masked.lastIndexOf("; ", plus), masked.lastIndexOf(": ", plus));
  const start = boundary < 0 ? 0 : boundary + 2;
  const endMatch = masked.slice(plus).search(/[.;](?:\s|$)/);
  const end = endMatch < 0 ? masked.length : plus + endMatch;
  let expression = masked.slice(start, end);
  let cap: number | null = null;
  const capped = expression.match(/,\s*capped at (\d+)\s*$/i);
  const totalled = expression.match(/\s*=\s*(\d+)\/(\d+)\s*$/);
  if (capped) { cap = Number(capped[1]); expression = expression.slice(0, capped.index); }
  else if (totalled) { cap = Number(totalled[2]); expression = expression.slice(0, totalled.index); }
  const terms = expression.split(/\s\+\s/).map(term => parseTerm(term, notes));
  if (terms.length < 2 || terms.some(term => !term || !term.label)) return { subscores: [] as Subscore[], cap: null, rest: text };
  const rest = unmask(`${masked.slice(0, start)}${masked.slice(end + 1)}`, notes);
  return { subscores: terms as Subscore[], cap, rest };
}

const sentenceSplit = /(?<=\.)\s+(?=[A-Z])/;
const clean = (text: string) => text.replace(/\s+/g, " ").replace(/\s+([.,;])/g, "$1").replace(/^[\s.;:,]+|[\s;:,]+$/g, "").trim();

export function parseEvidenceDetail(stored: string | null | undefined): EvidenceDetail {
  const raw = stored ?? "";
  // Imported or preserved research follows a blank line; the category evidence is the first block.
  const first = raw.split(/\n\s*\n/)[0].trim();
  const empty: EvidenceDetail = { source: null, reason: "", assessment_status: null, missing: [], additional_sources: [], subscores: [], cap: null, raw, structured: false };
  if (!first || first.startsWith("Unmapped spreadsheet research")) return empty;
  const linked = parseEvidence(first);
  let text = (linked?.reason ?? first).replace(/^Evidence:\s*/i, "");

  let additional_sources: string[] = [];
  const sourcesAt = text.search(/\bAdditional sources:/i);
  if (sourcesAt >= 0) {
    additional_sources = (text.slice(sourcesAt).match(/https?:\/\/[^\s,;]+/g) ?? []).map(url => url.replace(/[.)]+$/, ""));
    text = text.slice(0, sourcesAt);
  }
  let missing: string[] = [];
  const missingAt = text.search(/\bMissing:\s*/i);
  if (missingAt >= 0) {
    const tail = text.slice(missingAt).replace(/^Missing:\s*/i, "").trim();
    missing = /^none\b/i.test(tail) ? [] : tail.split(sentenceSplit).map(item => item.replace(/\.+$/, "").trim()).filter(Boolean);
    text = text.slice(0, missingAt);
  }
  let assessment_status: AssessmentStatus | null = null;
  const status = text.match(/Assessment status:\s*(met|not_met|unknown|partial)\.?/i);
  if (status) { assessment_status = status[1].toLowerCase() as AssessmentStatus; text = text.replace(status[0], " "); }

  const { subscores, cap, rest } = extractSubscores(text);
  const reason = clean(rest);
  return {
    source: linked?.source ?? null,
    reason,
    assessment_status,
    missing,
    additional_sources,
    subscores,
    cap,
    raw,
    structured: Boolean(linked || assessment_status || missing.length || additional_sources.length || subscores.length),
  };
}

export function sourceHost(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}
