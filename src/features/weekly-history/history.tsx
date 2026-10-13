import { companyHistory, describeMovement, type Movement, type Snapshot } from "@/domain/history";
import { formatDate } from "@/domain/text";
import { Delta } from "@/features/pipeline/delta";

export function MovementBadge({ movement, current }: { movement: Movement | null; current?: number }) {
  const label = describeMovement(movement, current);
  if (!movement) return <span className="muted">—</span>;
  const symbol = movement.kind === "up" ? `▲ ${movement.places}` : movement.kind === "down" ? `▼ ${movement.places}` : movement.kind === "new" ? "New" : "–";
  return <span className={`movement ${movement.kind}`} title={label} aria-label={label}>{symbol}</span>;
}

export function WeeklyHistory({ snapshots }: { snapshots: Snapshot[] }) {
  const rows = companyHistory(snapshots).toReversed();
  return <section className="card">
    <div className="card-head"><h2>Weekly history</h2><span className="muted">{rows.length ? `${rows.length} saved week${rows.length === 1 ? "" : "s"}` : "No weeks saved yet"}</span></div>
    {rows.length > 0 && <table className="mini-table"><thead><tr><th>Week of</th><th className="num">Rank</th><th className="num">Total</th><th>Change</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.week_start}>
        <td>{formatDate(r.week_start, { month: "short", day: "numeric" }) ?? r.week_start}</td>
        <td className="num">{r.rank}</td>
        <td className="num">{r.total ?? "—"}</td>
        <td title={describeMovement(r.movement, r.rank)}><Delta movement={r.movement} current={r.rank} emptyLabel="—" /></td>
      </tr>)}</tbody></table>}
  </section>;
}
