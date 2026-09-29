"use client";

import { useState } from "react";

import { PartnerTable } from "@/components/partners/PartnerTable";
import { usePartners } from "@/hooks/usePartners";

export default function PartnersPage() {
  const { partnersQuery, createPartner } = usePartners();
  const [form, setForm] = useState({
    name: "Acme North",
    slug: "acme-north",
    tier: "SILVER",
    agreementStatus: "ACTIVE",
    portalAccessEnabled: true,
    agreementEffectiveDate: "2026-01-01",
    agreementRenewalDate: "2027-01-01",
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <PartnerTable partners={partnersQuery.data ?? []} />

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Onboard partner</h2>
        <p className="mt-2 text-sm text-slate-600">
          This form hits the same REST boundary a real admin portal would use.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createPartner.mutate(form as any);
          }}
        >
          <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="field" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
          <select className="field" value={form.tier} onChange={(event) => setForm({ ...form, tier: event.target.value })}>
            <option value="REGISTERED">REGISTERED</option>
            <option value="SILVER">SILVER</option>
            <option value="GOLD">GOLD</option>
            <option value="PLATINUM">PLATINUM</option>
          </select>
          <button type="submit" className="button-primary" disabled={createPartner.isPending}>
            Create partner
          </button>
        </form>
      </section>
    </div>
  );
}
