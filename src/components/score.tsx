import { CircleCheck, CircleDashed, CircleHelp, CircleMinus } from "lucide-react";
import type { Score } from "@/domain/contracts/company";
import { barLevel, tierKey, tierLabel, type CategoryCell, type TierKey } from "@/domain/scoring/view";
import { rubric } from "@/domain/scoring/rubric";

const tierIcon: Record<TierKey, typeof CircleCheck> = { qualified: CircleCheck, maybe: CircleMinus, disqualified: CircleMinus, needs: CircleHelp, unscored: CircleDashed };

export function TierChip({ score, tier }: { score?: Score | null; tier?: TierKey }) {
  const key = tier ?? tierKey(score ?? null);
  const Icon = tierIcon[key];
  return <span className={`chip ${key}`}><Icon aria-hidden />{tierLabel[key]}</span>;
}

export function ScoreBar({ points, max, width }: { points: number; max: number; width?: number }) {
  const share = Math.max(0, Math.min(1, max ? points / max : 0));
  return <span className={`bar ${barLevel(points, max)}`} style={width ? { width } : undefined} aria-hidden><i style={{ width: `${share * 100}%` }} /></span>;
}

export function scoreCellLabel(cell: CategoryCell) {
  const name = rubric[cell.category].label;
  if (cell.points === null) return `${name}: unscored`;
  if (cell.needsEvidence) return `${name}: needs evidence — no points awarded until a source is verified`;
  return `${name}: ${cell.points} of ${cell.max}${cell.incomplete ? " (partial; evidence still being verified)" : ""}`;
}

// Compact category score: number plus a bar scaled to the category maximum. Evidence text never renders here.
export function ScoreCell({ cell, onOpen }: { cell: CategoryCell; onOpen?: () => void }) {
  const label = scoreCellLabel(cell);
  if (cell.points === null) return <span className="empty-cell" aria-label={label}>—</span>;
  if (cell.needsEvidence) return <button type="button" className="needs-cell" onClick={event => { event.stopPropagation(); onOpen?.(); }} aria-label={label} data-tip={label}><CircleHelp aria-hidden />Needs evidence</button>;
  return <button type="button" className={`score-cell${cell.incomplete ? " partial" : ""}`} onClick={event => { event.stopPropagation(); onOpen?.(); }} aria-label={label} data-tip={label}>
    <span className="n">{cell.points}</span><ScoreBar points={cell.points} max={cell.max} />
  </button>;
}
