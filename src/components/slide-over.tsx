"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Right-side panel. Esc and the backdrop close it; focus moves in on open and back on close.
export function SlideOver({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector(".palette-backdrop")) { event.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return <>
    <div className="sheet-backdrop" onClick={onClose} aria-hidden />
    <div ref={panel} className="sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>{children}</div>
  </>;
}
