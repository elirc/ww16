export function MdfTable({
  requests,
  onApprove,
  onReimburse,
  isMutating,
}: {
  requests: any[];
  onApprove: (requestId: string, amount: number) => void;
  onReimburse: (requestId: string, amount: number) => void;
  isMutating: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-ink">MDF pipeline</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50/90 text-left text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Campaign</th>
              <th className="px-6 py-3 font-medium">Partner</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Requested</th>
              <th className="px-6 py-3 font-medium">Approved</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((request) => (
              <tr key={request.id}>
                <td className="px-6 py-4">{request.campaignName}</td>
                <td className="px-6 py-4">{request.partnerOrg?.name}</td>
                <td className="px-6 py-4">{request.status}</td>
                <td className="px-6 py-4">${Number(request.amountRequested).toLocaleString()}</td>
                <td className="px-6 py-4">
                  {request.approvedAmount ? `$${Number(request.approvedAmount).toLocaleString()}` : "—"}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-2">
                    {request.status === "SUBMITTED" ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onApprove(request.id, Number(request.amountRequested))}
                        disabled={isMutating}
                      >
                        Approve
                      </button>
                    ) : null}
                    {request.status === "APPROVED" ? (
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() => onReimburse(request.id, Number(request.approvedAmount))}
                        disabled={isMutating}
                      >
                        Reimburse
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No MDF requests visible for the current session.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
