"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/query/apiClient";

type CreatePartnerPayload = {
  name: string;
  slug: string;
  tier: "REGISTERED" | "SILVER" | "GOLD" | "PLATINUM";
  agreementStatus: "PENDING_SIGNATURE" | "ACTIVE" | "EXPIRED";
  portalAccessEnabled: boolean;
  agreementEffectiveDate: string;
  agreementRenewalDate: string;
};

export function usePartners() {
  const queryClient = useQueryClient();

  const partnersQuery = useQuery({
    queryKey: ["partners"],
    queryFn: () => apiFetch<any[]>("/api/partners"),
  });

  const createPartner = useMutation({
    mutationFn: (payload: CreatePartnerPayload) =>
      apiFetch("/api/partners", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
    },
  });

  return {
    partnersQuery,
    createPartner,
  };
}
