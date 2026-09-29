import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/partners", label: "Partners" },
  { href: "/deals", label: "Deals" },
  { href: "/mdf", label: "MDF" },
  { href: "/reports", label: "Reports" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="card mb-6 flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-signal">
            Channel Compass
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Partner and channel ecosystem management
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Production-style learning scaffold for partner onboarding, deal registration, MDF,
            certifications, portal visibility, and leaderboard reporting.
          </p>
        </div>

        <nav className="flex flex-wrap gap-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-300/80 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
