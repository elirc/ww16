"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/query/apiClient";

type CreateMdfPayload = {
  partnerOrgId: string;
  campaignName: string;
  amountRequested: number;
  plannedStartDate: string;
  plannedEndDate: string;
};

export function useMdfRequests() {
  const queryClient = useQueryClient();

  const requestsQuery = useQuery({
    queryKey: ["mdf-requests"],
    queryFn: () => apiFetch<any[]>("/api/mdf-requests"),
  });

  const createRequest = useMutation({
    mutationFn: (payload: CreateMdfPayload) =>
      apiFetch("/api/mdf-requests", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mdf-requests"] });
    },
  });

  const decideRequest = useMutation({
    mutationFn: ({
      requestId,
      ...payload
    }: {
      requestId: string;
      nextStatus: "APPROVED" | "REJECTED";
      approvedAmount?: number;
      rejectionReason?: string;
    }) =>
      apiFetch(`/api/mdf-requests/${requestId}/decision`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mdf-requests"] });
    },
  });

  const reimburseRequest = useMutation({
    mutationFn: ({
      requestId,
      ...payload
    }: {
      requestId: string;
      amount: number;
      receiptUrl: string;
    }) =>
      apiFetch(`/api/mdf-requests/${requestId}/reimburse`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mdf-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
  });

  return {
    requestsQuery,
    createRequest,
    decideRequest,
    reimburseRequest,
  };
}
