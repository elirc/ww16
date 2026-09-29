"use client";

import { useState } from "react";

import { LeaderboardCard } from "@/components/reports/LeaderboardCard";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function ReportsPage() {
  const [quarter, setQuarter] = useState("2026-Q2");
  const leaderboardQuery = useLeaderboard(quarter);

  return (
    <div className="grid gap-6">
      <section className="card flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Leaderboard reporting</h2>
          <p className="mt-2 text-sm text-slate-600">
            Reads snapshot rows when they exist and falls back to live service computation otherwise.
          </p>
        </div>
        <input className="field max-w-xs" value={quarter} onChange={(event) => setQuarter(event.target.value)} />
      </section>

      <LeaderboardCard
        leaderboard={
          leaderboardQuery.data ?? {
            quarter,
            source: "live",
            rows: [],
          }
        }
      />
    </div>
  );
}
