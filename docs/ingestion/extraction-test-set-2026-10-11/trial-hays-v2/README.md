# Prepared Hays trial version 2

Ready to run; no response has been generated yet. No database changes or application
pipeline implementation are included.

The request uses the same Hays capture, llama3.1:8b model, temperature 0, 8192-token
context and 2500-token output limit as the first trial. Changes are the extraction
instructions and output format: a JSON schema replaces plain JSON mode. Because
both changed, this comparison evaluates the combined change rather than isolating
the contribution of each.

`request.json` includes only the instructions, schema and original source input.
`review-example.json` is a source-backed review reference, excluded from the request.
It is an acceptable example, not an exhaustive answer key or model-generated result.

The schema requires individual evidence for products/signals/events/contacts and
fixes verification flags to false. Structure cannot establish factual accuracy,
correct attribution, exact quotation matching or completeness; those still require
checking against the source. Unknown identities may have empty identity evidence.
Publication metadata should exactly match the input capture, including null dates.

Prepared-file checks passed: schema compilation, reference example conformity,
source quotation matching and input/settings equality. Negative checks reject a
true verification flag, a signal without evidence and undeclared fields.

The next action is to send request.json to the local Ollama /api/chat endpoint,
save the response here, validate structure and citations, then compare the separate
hiring, implementation, testing and readiness signals against the first trial.
Keep the review example out of the model context. After reviewing Hays, prepare
Miami University with the same instructions and schema.

Ollama supports a JSON schema in the format parameter; see the
[official structured-output documentation](https://github.com/ollama/ollama/blob/main/docs/capabilities/structured-outputs.mdx).
This is a local research format. It is not the Supabase company contract and must
not be passed directly to a database insert operation.
