export function LeaderboardCard({ leaderboard }: { leaderboard: any }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-signal">
              {leaderboard.quarter}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-ink">Partner leaderboard</h2>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Source: {leaderboard.source}
          </span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {leaderboard.rows?.map((row: any, index: number) => (
          <div key={row.partnerOrgId} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-signal">
                Rank {index + 1}
              </p>
              <h3 className="mt-1 text-base font-semibold text-ink">{row.partnerName}</h3>
              <p className="text-sm text-slate-500">{row.tier}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">Deals</p>
                <p className="mt-1 font-semibold text-slate-900">{row.approvedDealCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">ARR</p>
                <p className="mt-1 font-semibold text-slate-900">
                  ${Number(row.approvedDealArr).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">MDF</p>
                <p className="mt-1 font-semibold text-slate-900">
                  ${Number(row.reimbursedMdf).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em]">Score</p>
                <p className="mt-1 font-semibold text-slate-900">{Number(row.score).toFixed(1)}</p>
              </div>
            </div>
          </div>
        ))}
        {leaderboard.rows?.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No leaderboard data for this quarter yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}
