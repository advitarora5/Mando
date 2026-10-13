import { leadStatuses, type LeadStatus } from "./contracts/company.ts";

export { leadStatuses };
export type { LeadStatus };

export const leadStatusLabels: Record<LeadStatus, string> = {
  queued: "Queued",
  contacted: "Contacted",
  replied: "Replied",
  demo_booked: "Demo booked",
};

// The date column each status stamps when a rep selects it. queued is the initial
// state and carries no date.
const stampColumn: Record<LeadStatus, "contacted_at" | "replied_at" | "demo_booked_at" | null> = {
  queued: null,
  contacted: "contacted_at",
  replied: "replied_at",
  demo_booked: "demo_booked_at",
};

// Pure values to write when a rep sets a status by hand. Transitions are manual for now
// (no order enforcement); selecting a status stamps only that status's date to `now`.
// Re-saving the same status is a no-op so it never moves an already-recorded date.
export function leadStatusWrite(
  status: LeadStatus,
  previous: LeadStatus,
  now: string,
): { lead_status: LeadStatus; contacted_at?: string; replied_at?: string; demo_booked_at?: string } {
  if (status === previous) return { lead_status: status };
  const column = stampColumn[status];
  return column ? { lead_status: status, [column]: now } : { lead_status: status };
}
