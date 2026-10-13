// Splits stored prose into short bullets for display. Wording is unchanged; only sentence breaks are used.
export function bullets(text: string | null | undefined, max = 3): { items: string[]; rest: number } {
  const sentences = (text ?? "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).map(s => s.trim()).filter(Boolean);
  return { items: sentences.slice(0, max), rest: Math.max(0, sentences.length - max) };
}

export function formatDate(value: string | null | undefined, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-US", { timeZone: "America/Chicago", ...options });
}
