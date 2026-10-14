"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Download, Inbox, LayoutList, Rows3, Search, BookOpen, Filter, CalendarCheck } from "lucide-react";

export type PaletteCompany = { id: string; name: string; meta: string };
type Entry = { id: string; group: string; label: string; meta?: string; icon: React.ReactNode; run: () => void };

export const OPEN_PALETTE = "mando:open-palette";
export const PIPELINE_EVENT = "mando:pipeline";

// True when a keystroke belongs to a text field and must not trigger a global shortcut.
export function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

export function CommandPalette({ companies }: { companies: PaletteCompany[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setQuery(""); setIndex(0); setOpen(value => !value); }
    }
    const onOpen = () => { setQuery(""); setIndex(0); setOpen(true); };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE, onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_PALETTE, onOpen); };
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const go = (href: string) => () => { setOpen(false); router.push(href); };
    const pipeline = (action: string) => () => {
      setOpen(false);
      if (window.location.pathname === "/") window.dispatchEvent(new CustomEvent(PIPELINE_EVENT, { detail: action }));
      else router.push(`/?action=${action}`);
    };
    const views: [string, string][] = [["qualified", "Qualified"], ["maybe", "Maybe"], ["needs", "Needs evidence"], ["ready", "Ready for outreach"], ["all", "All companies"]];
    return [
      ...companies.map(c => ({ id: `c-${c.id}`, group: "Companies", label: c.name, meta: c.meta, icon: <Building2 aria-hidden />, run: go(`/companies/${c.id}`) })),
      ...views.map(([id, label]) => ({ id: `v-${id}`, group: "Views", label: `View: ${label}`, icon: <Filter aria-hidden />, run: go(id === "all" ? "/" : `/?view=${id}`) })),
      { id: "n-pipeline", group: "Go to", label: "Pipeline", icon: <LayoutList aria-hidden />, run: go("/") },
      { id: "n-leads", group: "Go to", label: "Today's leads", icon: <CalendarCheck aria-hidden />, run: go("/todays-leads") },
      { id: "n-outreach", group: "Go to", label: "Outreach queue", icon: <Inbox aria-hidden />, run: go("/outreach") },
      { id: "n-method", group: "Go to", label: "Research methodology", icon: <BookOpen aria-hidden />, run: go("/methodology") },
      { id: "a-density", group: "Actions", label: "Toggle row density", icon: <Rows3 aria-hidden />, run: pipeline("density") },
      { id: "a-export", group: "Actions", label: "Export current view as CSV", icon: <Download aria-hidden />, run: pipeline("export") },
    ];
  }, [companies, router]);

  const q = query.trim().toLowerCase();
  const results = (q ? entries.filter(e => `${e.label} ${e.meta ?? ""}`.toLowerCase().includes(q)) : entries.filter(e => e.group !== "Companies" || entries.indexOf(e) < 6)).slice(0, 40);
  const safeIndex = Math.min(index, Math.max(results.length - 1, 0));

  if (!open) return null;
  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") { event.preventDefault(); setIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); results[safeIndex]?.run(); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
  }
  let lastGroup = "";
  return <div className="palette-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette" onKeyDown={onKey}>
      <div className="palette-input"><Search aria-hidden /><input ref={input} autoFocus value={query} onChange={e => { setQuery(e.target.value); setIndex(0); }} placeholder="Search companies, views and actions…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={results[safeIndex] ? `pal-${results[safeIndex].id}` : undefined} /></div>
      <ul className="palette-list" id="palette-list" role="listbox">
        {results.length === 0 && <li className="empty-state">No matches</li>}
        {results.map((entry, i) => {
          const header = entry.group !== lastGroup ? <li className="palette-group" role="presentation">{entry.group}</li> : null;
          lastGroup = entry.group;
          return <Fragment key={entry.id}>{header}<li id={`pal-${entry.id}`} role="option" aria-selected={i === safeIndex} className="palette-item" onMouseMove={() => setIndex(i)} onClick={entry.run}>
            {entry.icon}<span className="label">{entry.label}</span>{entry.meta && <span className="meta">{entry.meta}</span>}{i === safeIndex && <ArrowRight aria-hidden />}
          </li></Fragment>;
        })}
      </ul>
      <div className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div>
    </div>
  </div>;
}

export function SearchTrigger() {
  return <button type="button" className="search-trigger" onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE))} aria-label="Search and commands (Ctrl+K)">
    <Search aria-hidden /><span>Search or jump to…</span><kbd>Ctrl K</kbd>
  </button>;
}
