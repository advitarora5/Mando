import { z } from "zod";
import { projectTypes, signalTypes } from "./pipeline-score.ts";
import { verifyQuote } from "./quote.ts";

// The fixed form a model fills from messy text. Missing information stays null or empty; nothing is inferred.
export const seniorityLevels = ["executive", "director", "manager", "senior_individual", "individual"] as const;

export const modelSignalSchema = z.object({
  type: z.enum(signalTypes),
  quote: z.string(),
  date_text: z.string().nullable(),
}).strict();

export const extractionOutputSchema = z.object({
  company_name: z.string().nullable(),
  workday_products: z.array(z.string()).max(12),
  project_type: z.enum(projectTypes).nullable(),
  role_seniority: z.enum(seniorityLevels).nullable(),
  timing_words: z.array(z.string()).max(8),
  signals: z.array(modelSignalSchema).max(5),
}).strict();

export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;

// Sent to Ollama as `format` (and to OpenAI-compatible APIs as a json_schema) so replies are shaped before validation.
export const extractionJsonSchema = z.toJSONSchema(extractionOutputSchema);

export type CheckedSignal = { type: ExtractionOutput["signals"][number]["type"]; quote: string; date_text: string | null };
export type CheckedExtraction = {
  output: ExtractionOutput;
  signals: CheckedSignal[];
  dropped: { field: string; value: string; reason: string }[];
};

const present = (value: string, text: string) => value.trim().length > 1 && text.toLowerCase().includes(value.trim().toLowerCase());

// Grounds a model reading in its source text. Quotes must be verbatim (otherwise the signal is dropped);
// company, products, timing words and dates must appear in the text (otherwise they are cleared).
// Every removal is recorded so evaluation can count hallucinations.
export function groundExtraction(output: ExtractionOutput, text: string): CheckedExtraction {
  const dropped: CheckedExtraction["dropped"] = [];
  const keep = (field: string, values: string[]) => values.filter(value => {
    if (present(value, text)) return true;
    dropped.push({ field, value, reason: "not in source text" });
    return false;
  });
  const company = output.company_name && present(output.company_name, text) ? output.company_name.trim() : null;
  if (output.company_name && !company) dropped.push({ field: "company_name", value: output.company_name, reason: "not in source text" });
  const signals: CheckedSignal[] = [];
  const seen = new Set<string>();
  for (const signal of output.signals) {
    const check = verifyQuote(signal.quote, text);
    if (!check.ok) { dropped.push({ field: `signals.${signal.type}.quote`, value: signal.quote, reason: check.reason }); continue; }
    const key = `${signal.type}|${check.quote}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const date = signal.date_text && present(signal.date_text, text) ? signal.date_text.trim() : null;
    if (signal.date_text && !date) dropped.push({ field: `signals.${signal.type}.date_text`, value: signal.date_text, reason: "not in source text" });
    signals.push({ type: signal.type, quote: check.quote, date_text: date });
  }
  return {
    output: { ...output, company_name: company, workday_products: keep("workday_products", output.workday_products), timing_words: keep("timing_words", output.timing_words) },
    signals, dropped,
  };
}
