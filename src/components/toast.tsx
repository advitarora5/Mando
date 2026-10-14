"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Check, TriangleAlert } from "lucide-react";

type Tone = "ok" | "error";
const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string; tone: Tone }[]>([]);
  const push = useCallback((text: string, tone: Tone = "ok") => {
    const id = Date.now() + Math.random();
    setItems(current => [...current.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems(current => current.filter(item => item.id !== id)), 2400);
  }, []);
  return <ToastContext value={push}>
    {children}
    <div className="toasts" role="status" aria-live="polite">{items.map(item => <div className={`toast ${item.tone}`} key={item.id}>{item.tone === "error" ? <TriangleAlert aria-hidden /> : <Check aria-hidden />}{item.text}</div>)}</div>
  </ToastContext>;
}

export const useToast = () => useContext(ToastContext);

export function useCopy() {
  const toast = useToast();
  return useCallback(async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast(`${label} copied`); }
    catch { toast("Copy failed — select and copy by hand", "error"); }
  }, [toast]);
}
