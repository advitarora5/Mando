"use client";

import { useEffect } from "react";

// Native <details className="menu"> popovers do not close on Esc or an outside click.
// One document-level listener handles every menu in the app. Esc is captured first so
// it closes the menu without also clearing selection or closing a slide-over.
export function MenuDismiss() {
  useEffect(() => {
    const openMenus = () => [...document.querySelectorAll<HTMLDetailsElement>("details.menu[open]")];
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const menus = openMenus();
      if (!menus.length) return;
      menus.forEach(menu => { menu.open = false; menu.querySelector("summary")?.focus(); });
      event.stopPropagation();
    }
    function onPointer(event: PointerEvent) {
      openMenus().forEach(menu => { if (!menu.contains(event.target as Node)) menu.open = false; });
    }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey, true); document.removeEventListener("pointerdown", onPointer); };
  }, []);
  return null;
}
