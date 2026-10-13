"use client";

import { useEffect, useState, type ReactNode, type KeyboardEvent } from "react";

export type TabItem = { id: string; label: string; count?: number; content: ReactNode };

// Controlled tab bar for panels that render their own content.
export function TabBar<T extends string>({ items, value, onChange, idPrefix }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void; idPrefix: string }) {
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = items.findIndex(item => item.id === value);
    const next = items[(index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    onChange(next.id);
    document.getElementById(`${idPrefix}-${next.id}`)?.focus();
  }
  return <div className="tabs" role="tablist" onKeyDown={onKey}>
    {items.map(item => <button key={item.id} id={`${idPrefix}-${item.id}`} type="button" role="tab" className="tab" aria-selected={item.id === value} aria-controls={`${idPrefix}-panel`} tabIndex={item.id === value ? 0 : -1} onClick={() => onChange(item.id)}>
      {item.label}{item.count !== undefined && <span className="count">{item.count}</span>}
    </button>)}
  </div>;
}

// Accessible tabs. With `hash`, the active tab follows the URL hash so links like #contacts keep working.
export function Tabs({ items, initial, hash = false, idPrefix = "tab", className = "" }: { items: TabItem[]; initial?: string; hash?: boolean; idPrefix?: string; className?: string }) {
  const [active, setActive] = useState(initial ?? items[0]?.id);
  useEffect(() => {
    if (!hash) return;
    const sync = () => { const id = window.location.hash.slice(1); if (items.some(item => item.id === id)) setActive(id); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [hash, items]);
  function select(id: string) {
    setActive(id);
    if (hash) window.history.replaceState(null, "", `#${id}`);
  }
  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const index = items.findIndex(item => item.id === active);
    const next = items[(index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    select(next.id);
    document.getElementById(`${idPrefix}-${next.id}`)?.focus();
  }
  return <>
    <div className={className}><div className="tabs" role="tablist" onKeyDown={onKey}>
      {items.map(item => <button key={item.id} id={`${idPrefix}-${item.id}`} type="button" role="tab" className="tab" aria-selected={item.id === active} aria-controls={`${idPrefix}-panel-${item.id}`} tabIndex={item.id === active ? 0 : -1} onClick={() => select(item.id)}>
        {item.label}{item.count !== undefined && <span className="count">{item.count}</span>}
      </button>)}
    </div></div>
    {items.map(item => <div key={item.id} id={`${idPrefix}-panel-${item.id}`} role="tabpanel" aria-labelledby={`${idPrefix}-${item.id}`} hidden={item.id !== active} className="tab-panel">{item.id === active && item.content}</div>)}
  </>;
}
