import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarCheck, Inbox, LayoutList } from "lucide-react";
import { LogoutButton } from "@/features/login/logout";
import { CommandPalette, SearchTrigger, type PaletteCompany } from "./command-palette";
import { ToastProvider } from "./toast";
import type { CompanyListItem } from "@/domain/contracts/company";
import { tierKey, tierLabel } from "@/domain/scoring/view";

export function paletteCompanies(companies: CompanyListItem[]): PaletteCompany[] {
  return companies.map(c => ({ id: c.id, name: c.name, meta: c.score ? `${tierLabel[tierKey(c.score)]} · ${c.score.total}` : "Unscored" }));
}

export function AppShell({ active, companies, children }: { active: "pipeline" | "leads" | "outreach" | "record"; companies: PaletteCompany[]; children: ReactNode }) {
  return <ToastProvider>
    <div className="app">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="mando, prospect intelligence home"><span className="brand-mark" aria-hidden>m</span>mando<span className="brand-sub">Prospect intelligence</span></Link>
        <nav className="views" aria-label="Views">
          <Link href="/" aria-current={active === "pipeline" ? "page" : undefined}><LayoutList aria-hidden /><span>Pipeline</span></Link>
          <Link href="/todays-leads" aria-current={active === "leads" ? "page" : undefined}><CalendarCheck aria-hidden /><span>Today&apos;s leads</span></Link>
          <Link href="/outreach" aria-current={active === "outreach" ? "page" : undefined}><Inbox aria-hidden /><span>Outreach</span></Link>
        </nav>
        <SearchTrigger />
        <div className="topbar-end"><LogoutButton /></div>
      </header>
      <main className="app-main" id="main">{children}</main>
    </div>
    <CommandPalette companies={companies} />
  </ToastProvider>;
}
