import type { ExtractedClaim } from "./extraction.ts";

type Source = { capture_ref: string; segments: { id: string; text: string }[] };

const MIN_QUOTE_WORDS = 3;

// Only typography is forgiven: line breaks and curly vs straight quotes. Wording and case must match exactly.
const squash = (value: string) => value.replace(/[‘’‚‛]/g, "'").replace(/[“”„]/g, '"').replace(/\s+/g, " ").trim();

/** Returns why the claim's evidence is not usable, or null when its quote is verbatim in the cited segment. */
export function evidenceProblem(claim: ExtractedClaim, sources: Source[]): string | null {
  const { capture_ref, segment_id, quote } = claim.evidence;
  const source = sources.find(item => item.capture_ref === capture_ref);
  if (!source) return `unknown capture_ref ${capture_ref}`;
  const segment = source.segments.find(item => item.id === segment_id);
  if (!segment) return `unknown segment_id ${segment_id} in ${capture_ref}`;
  if (squash(quote).split(" ").length < MIN_QUOTE_WORDS) return `quote is shorter than ${MIN_QUOTE_WORDS} words`;
  if (!squash(segment.text).includes(squash(quote))) return `quote is not verbatim in ${segment_id}`;
  return null;
}

/** Splits claims into those backed by their cited segment and those rejected, with the reason. */
export function checkEvidence(claims: ExtractedClaim[], sources: Source[]) {
  const accepted: ExtractedClaim[] = [];
  const rejected: { claim: ExtractedClaim; reason: string }[] = [];
  for (const claim of claims) {
    const reason = evidenceProblem(claim, sources);
    if (reason) rejected.push({ claim, reason }); else accepted.push(claim);
  }
  return { accepted, rejected };
}
