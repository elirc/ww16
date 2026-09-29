"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/query/apiClient";

export function useLeaderboard(quarter: string) {
  return useQuery({
    queryKey: ["leaderboard", quarter],
    queryFn: () => apiFetch<any>(`/api/reports/leaderboard?quarter=${quarter}`),
  });
}
