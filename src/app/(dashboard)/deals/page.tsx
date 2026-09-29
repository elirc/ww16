"use client";

import { useState } from "react";

import { DealBoard } from "@/components/deals/DealBoard";
import { useDeals } from "@/hooks/useDeals";

export default function DealsPage() {
  const { dealsQuery, createDeal, transitionDeal } = useDeals();
  const [form, setForm] = useState({
    partnerOrgId: "partner-acme",
    endCustomerName: "Blue Yonder Retail",
    projectedArr: 85000,
    closeDate: "2026-06-30",
    notes: "Large co-sell opportunity routed through the partner portal.",
    assignedSalesRepId: "demo-sales-rep",
    channelManagerId: "demo-channel-manager",
  });

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Register new deal</h2>
            <p className="mt-2 text-sm text-slate-600">
              Creates a draft; workflow buttons below push it through the state machine.
            </p>
          </div>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              createDeal.mutate(form);
            }}
          >
            <input className="field" value={form.partnerOrgId} onChange={(event) => setForm({ ...form, partnerOrgId: event.target.value })} />
            <input className="field" value={form.endCustomerName} onChange={(event) => setForm({ ...form, endCustomerName: event.target.value })} />
            <input className="field" type="number" value={form.projectedArr} onChange={(event) => setForm({ ...form, projectedArr: Number(event.target.value) })} />
            <button type="submit" className="button-primary md:col-span-3" disabled={createDeal.isPending}>
              Create draft deal
            </button>
          </form>
        </div>
      </section>

      <DealBoard
        deals={dealsQuery.data ?? []}
        isTransitioning={transitionDeal.isPending}
        onTransition={(dealId, nextStatus) =>
          transitionDeal.mutate({
            dealId,
            nextStatus,
            rejectionReason: nextStatus === "REJECTED" ? "Rejected during demo workflow." : undefined,
          })
        }
      />
    </div>
  );
}
