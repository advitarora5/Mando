# Miami University extraction trial version 2

Ran local llama3.1:8b on case-04 using the revised instructions and schema. The
source text and answer key were separated. The model reported about 59 seconds.
No database records or application pipeline code were changed.

## Supported information recovered

- Miami University explicitly identified as an end customer.
- HCM, FIN, Payroll and Student extracted as Workday products; FIN can be normalized
  to Financial Management in a later reviewed mapping.
- Completed HCM/FIN/Payroll rollout separated from planned Student deployment.
- Publication date and employee count left null; 20,000 students was not converted
  into an employee count.
- Present project status was not declared independently verified.

## Errors requiring review

- July 2024 and October 2026 are go-live/deployment dates, not project starts.
  The event_type should be go_live, with precision month and normalized values
  2024-07 and 2026-10. No exact day should be invented.
- Avaap is an implementation partner organization, not a named person/contact.
  It should be a separate provider entity; named_contacts should be empty.
- The uncertainties array is empty despite an unknown publication date and
  unverified present deployment status. These uncertainties should be explicit.
- The completed rollout quotation was altered by inserting a comma after FIN.
  Both occurrences fail exact quotation checking even though the paraphrased
  underlying rollout claim is supported.
- The identity citation uses segment_id null but quotes only Miami University
  rather than the full capture title. Use a cited body segment containing the name
  or the exact full title under the current title-evidence rule.

## Assessment

The output matches the JSON structure but does not pass the full factual/citation
review. It contains useful company and product evidence and better separation of
activities, but incorrect date semantics and the provider/contact confusion make
it unsuitable for automatic insertion. This different-source trial does not isolate
improvement from the first Hays trial; a same-source Hays rerun is still needed for
that comparison.

Preserve the raw result unchanged. The next instruction revision should explicitly
restrict contacts to natural persons and make go-live date classification and month
normalization clearer. Structural validation, exact citation checks and manual
semantic review are separate checks.
