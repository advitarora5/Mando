import { ChevronRight, CircleCheck, CircleHelp, CircleX, ExternalLink, Link2 } from "lucide-react";
import type { Category, Score } from "@/domain/contracts/company";
import { categories } from "@/domain/contracts/company";
import { rubric } from "@/domain/scoring/rubric";
import { parseEvidenceDetail, sourceHost, type AssessmentStatus } from "@/domain/scoring/evidence-detail";
import { categoryCells } from "@/domain/scoring/view";
import { safeUrl } from "@/domain/contracts/detail";
import { ScoreBar } from "./score";

const statusText: Record<AssessmentStatus, string> = { met: "Criterion met", not_met: "Criterion not met", partial: "Partially evidenced", unknown: "Not yet verified" };
const statusIcon: Record<AssessmentStatus, typeof CircleCheck> = { met: CircleCheck, not_met: CircleX, partial: CircleHelp, unknown: CircleHelp };

export function SourceChip({ url }: { url: string }) {
  const href = safeUrl(url);
  if (!href) return null;
  return <a className="src-chip" href={href} target="_blank" rel="noopener noreferrer" title={href}><Link2 aria-hidden /><span>{sourceHost(href)}</span><ExternalLink aria-hidden /></a>;
}

function EvidenceCard({ score, category, open }: { score: Score; category: Category; open: boolean }) {
  const cell = categoryCells(score).find(c => c.category === category)!;
  const detail = parseEvidenceDetail(score[`${category}_evidence`]);
  const Status = detail.assessment_status ? statusIcon[detail.assessment_status] : null;
  const reason = detail.reason || (detail.raw.startsWith("Unmapped spreadsheet research") ? "Imported spreadsheet research awaits category review." : "No evidence recorded for this category.");
  return <details className="ev-card" open={open} data-focus={open} id={`evidence-${category}`}>
    <summary>
      <span className="ev-title"><ChevronRight aria-hidden />{rubric[category].label}</span>
      <span className="ev-points">
        {cell.needsEvidence ? <span className="chip needs"><CircleHelp aria-hidden />Needs evidence</span>
          : <><span className="n">{cell.points}<small> / {cell.max}</small></span><ScoreBar points={cell.points ?? 0} max={cell.max} /></>}
      </span>
      <span className="ev-reason">{reason}</span>
    </summary>
    <div className="ev-body">
      {Status && detail.assessment_status && <span className={`status-label ${detail.assessment_status}`}><Status aria-hidden />{statusText[detail.assessment_status]}</span>}
      {detail.subscores.length > 0 && <div>
        <p className="ev-label">How the points add up</p>
        <div className="subscores">
          {detail.subscores.map((part, i) => <div className="subscore" key={i}>
            <span>{part.label}</span><span className={`pts${part.points === 0 ? " zero" : ""}`}>{part.points}{part.max !== null && <span className="faint"> / {part.max}</span>}</span>
            {part.note && <small>{part.note}</small>}
          </div>)}
          {detail.cap !== null && <div className="subscore cap"><span>Category maximum</span><span className="pts">{detail.cap}</span></div>}
        </div>
      </div>}
      {(detail.source || detail.additional_sources.length > 0) && <div>
        <p className="ev-label">Sources</p>
        <div className="src-row">{[detail.source, ...detail.additional_sources].filter((u): u is string => !!u).map(url => <SourceChip key={url} url={url} />)}</div>
      </div>}
      {detail.missing.length > 0 && <div>
        <p className="ev-label">Missing</p>
        <ul className="missing">{detail.missing.map(item => <li key={item}>{item}</li>)}</ul>
      </div>}
      {detail.raw && <details className="raw"><summary>Show raw evidence</summary><pre>{detail.raw}</pre></details>}
    </div>
  </details>;
}

export function EvidenceCards({ score, focus }: { score: Score | null; focus?: Category | "all" | null }) {
  if (!score) return <div className="empty-state"><CircleHelp aria-hidden /><strong>No assessment yet</strong><span>Scores and evidence appear here once this company is assessed.</span></div>;
  return <div className="ev-list">{categories.map(category => <EvidenceCard key={category} score={score} category={category} open={focus === "all" || focus === category} />)}</div>;
}
