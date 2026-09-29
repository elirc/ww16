const nextActionMap: Record<string, Array<{ label: string; nextStatus: string }>> = {
  DRAFT: [{ label: "Submit", nextStatus: "SUBMITTED" }],
  SUBMITTED: [
    { label: "Sales approve", nextStatus: "SALES_APPROVED" },
    { label: "Reject", nextStatus: "REJECTED" },
  ],
  SALES_APPROVED: [
    { label: "Channel approve", nextStatus: "APPROVED" },
    { label: "Reject", nextStatus: "REJECTED" },
  ],
  APPROVED: [
    { label: "Closed won", nextStatus: "CLOSED_WON" },
    { label: "Closed lost", nextStatus: "CLOSED_LOST" },
  ],
  REJECTED: [],
  CLOSED_WON: [],
  CLOSED_LOST: [],
};

export function DealBoard({
  deals,
  onTransition,
  isTransitioning,
}: {
  deals: any[];
  onTransition: (dealId: string, nextStatus: string) => void;
  isTransitioning: boolean;
}) {
  return (
    <div className="grid gap-4">
      {deals.map((deal) => (
        <article key={deal.id} className="card p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-signal">
                {deal.status}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{deal.endCustomerName}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {deal.partnerOrg?.name} · ARR ${Number(deal.projectedArr).toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-slate-500">{deal.notes ?? "No notes provided."}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {nextActionMap[deal.status]?.map((action) => (
                <button
                  key={action.nextStatus}
                  type="button"
                  className="button-secondary"
                  onClick={() => onTransition(deal.id, action.nextStatus)}
                  disabled={isTransitioning}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Approval trail</p>
            <ul className="mt-2 space-y-1">
              {(deal.approvals ?? []).map((approval: any) => (
                <li key={approval.id}>
                  {approval.fromStatus} → {approval.toStatus} {approval.note ? `(${approval.note})` : ""}
                </li>
              ))}
              {(deal.approvals ?? []).length === 0 ? <li>No approvals yet.</li> : null}
            </ul>
          </div>
        </article>
      ))}
      {deals.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          No deals visible for the current session.
        </div>
      ) : null}
    </div>
  );
}
