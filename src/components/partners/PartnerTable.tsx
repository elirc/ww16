export function PartnerTable({ partners }: { partners: any[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-ink">Partner roster</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/90 text-left text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Partner</th>
              <th className="px-6 py-3 font-medium">Tier</th>
              <th className="px-6 py-3 font-medium">Agreement</th>
              <th className="px-6 py-3 font-medium">Certifications</th>
              <th className="px-6 py-3 font-medium">Open workload</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {partners.map((partner) => (
              <tr key={partner.id}>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{partner.name}</div>
                  <div className="text-slate-500">{partner.slug}</div>
                </td>
                <td className="px-6 py-4">{partner.tier}</td>
                <td className="px-6 py-4">{partner.agreementStatus}</td>
                <td className="px-6 py-4">
                  {partner.certificationRecords?.map((record: any) => record.definition.name).join(", ") ||
                    "None"}
                </td>
                <td className="px-6 py-4">
                  {partner._count?.deals ?? 0} deals / {partner._count?.mdfRequests ?? 0} MDF
                </td>
              </tr>
            ))}
            {partners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No partners found for the current session scope.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
