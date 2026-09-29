"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/query/apiClient";

export type SessionPayload = {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  partnerOrgId: string | null;
  permissions: string[];
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<SessionPayload>("/api/session"),
  });
}
