"use client";

import { useCallback, useSyncExternalStore } from "react";

// Per-viewer preference in localStorage. Falls back to the default when storage is unavailable,
// and renders the default on the server so hydration never mismatches.
const EVENT = "mando:persisted";

function read(key: string) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

export function usePersisted<T>(key: string, fallback: T): [T, (value: T) => void] {
  const subscribe = useCallback((notify: () => void) => {
    const onChange = (event: Event) => { if (!(event instanceof CustomEvent) || event.detail === key) notify(); };
    window.addEventListener("storage", onChange);
    window.addEventListener(EVENT, onChange);
    return () => { window.removeEventListener("storage", onChange); window.removeEventListener(EVENT, onChange); };
  }, [key]);
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  let value = fallback;
  if (raw) { try { value = JSON.parse(raw) as T; } catch { value = fallback; } }
  const set = useCallback((next: T) => {
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage blocked: preference lasts for this render only */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  }, [key]);
  return [value, set];
}
