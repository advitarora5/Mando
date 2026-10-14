"use client";

import { Copy } from "lucide-react";
import { useCopy } from "./toast";

export function CopyButton({ text, label, children, disabled }: { text: string; label: string; children: React.ReactNode; disabled?: boolean }) {
  const copy = useCopy();
  return <button type="button" className="btn" disabled={disabled || !text} onClick={() => copy(text, label)}><Copy aria-hidden />{children}</button>;
}
