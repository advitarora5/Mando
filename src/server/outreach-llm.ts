import "server-only";

// Same endpoint settings as scripts/generate-drafts.mjs: DRAFTS_LLM_* first, then LLM_*, then local Ollama.
// On a hosted deployment, set DRAFTS_LLM_BASE_URL, DRAFTS_LLM_API_KEY and DRAFTS_LLM_MODEL in the host's environment variables;
// the localhost fallback only works when the app runs on the same machine as Ollama.
export async function completeJson(prompt: string): Promise<string> {
  const env = process.env;
  const base = env.DRAFTS_LLM_BASE_URL ?? env.LLM_BASE_URL ?? "http://localhost:11434/v1";
  const key = env.DRAFTS_LLM_API_KEY ?? env.LLM_API_KEY ?? "ollama";
  const model = env.DRAFTS_LLM_MODEL ?? env.LLM_MODEL ?? "llama3.1";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, "x-title": "Mando CUBE outreach drafts" },
    body: JSON.stringify({ model, temperature: 0.4, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(50_000),
  }).catch((error: unknown) => {
    if (error instanceof Error && error.name === "TimeoutError") throw new Error("The model took too long to answer. Try again, or switch DRAFTS_LLM_MODEL to a faster model.");
    throw new Error("Could not reach the model server. Check DRAFTS_LLM_BASE_URL, DRAFTS_LLM_API_KEY and DRAFTS_LLM_MODEL in the environment, and try again.");
  });
  if (!res.ok) throw new Error(`The model service returned an error (${res.status}). Check the API key and model name.`);
  const json = await res.json().catch(() => null);
  return json?.choices?.[0]?.message?.content ?? "";
}
