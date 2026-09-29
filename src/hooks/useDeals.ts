"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/query/apiClient";

type CreateDealPayload = {
  partnerOrgId: string;
  endCustomerName: string;
  projectedArr: number;
  closeDate: string;
  notes?: string;
  assignedSalesRepId?: string;
  channelManagerId?: string;
};

type DealTransitionPayload = {
  nextStatus: string;
  note?: string;
  rejectionReason?: string;
};

export function useDeals() {
  const queryClient = useQueryClient();

  const dealsQuery = useQuery({
    queryKey: ["deals"],
    queryFn: () => apiFetch<any[]>("/api/deals"),
  });

  const createDeal = useMutation({
    mutationFn: (payload: CreateDealPayload) =>
      apiFetch("/api/deals", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });

  const transitionDeal = useMutation({
    mutationFn: ({ dealId, ...payload }: DealTransitionPayload & { dealId: string }) =>
      apiFetch(`/api/deals/${dealId}/transition`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  return {
    dealsQuery,
    createDeal,
    transitionDeal,
  };
}
