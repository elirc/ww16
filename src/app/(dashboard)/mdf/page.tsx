"use client";

import { useState } from "react";

import { MdfTable } from "@/components/mdf/MdfTable";
import { useMdfRequests } from "@/hooks/useMdfRequests";

export default function MdfPage() {
  const { requestsQuery, createRequest, decideRequest, reimburseRequest } = useMdfRequests();
  const [form, setForm] = useState({
    partnerOrgId: "partner-acme",
    campaignName: "Q3 retail roadshow",
    amountRequested: 14000,
    plannedStartDate: "2026-07-01",
    plannedEndDate: "2026-09-15",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <MdfTable
        requests={requestsQuery.data ?? []}
        isMutating={decideRequest.isPending || reimburseRequest.isPending}
        onApprove={(requestId, amount) =>
          decideRequest.mutate({
            requestId,
            nextStatus: "APPROVED",
            approvedAmount: amount,
          })
        }
        onReimburse={(requestId, amount) =>
          reimburseRequest.mutate({
            requestId,
            amount,
            receiptUrl: "https://example.com/receipts/demo.pdf",
          })
        }
      />

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Submit MDF request</h2>
        <p className="mt-2 text-sm text-slate-600">
          MDF starts submitted, then finance decides, then reimbursement creates a separate payout record.
        </p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createRequest.mutate(form);
          }}
        >
          <input className="field" value={form.partnerOrgId} onChange={(event) => setForm({ ...form, partnerOrgId: event.target.value })} />
          <input className="field" value={form.campaignName} onChange={(event) => setForm({ ...form, campaignName: event.target.value })} />
          <input className="field" type="number" value={form.amountRequested} onChange={(event) => setForm({ ...form, amountRequested: Number(event.target.value) })} />
          <button type="submit" className="button-primary" disabled={createRequest.isPending}>
            Submit request
          </button>
        </form>
      </section>
    </div>
  );
}
