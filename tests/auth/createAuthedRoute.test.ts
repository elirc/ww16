import { beforeEach, describe, expect, it, vi } from "vitest";

const getRequestSessionMock = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  getRequestSession: getRequestSessionMock,
}));

describe("createAuthedRoute", () => {
  beforeEach(() => {
    getRequestSessionMock.mockReset();
  });

  it("rejects a protected endpoint when the acting role lacks the required permission", async () => {
    // Why this test matters: protected operator endpoints are a common place for accidental privilege escalation.
    // Production bug caught by this test: a role matrix change that suddenly lets non-ops users process background jobs.
    getRequestSessionMock.mockResolvedValue({
      userId: "demo-sales-rep",
      email: "sales-rep@example.com",
      displayName: "Sam Sales",
      role: "SALES_REP",
      partnerOrgId: null,
    });

    const { createAuthedRoute } = await import("@/lib/http/route-handlers");

    const handler = createAuthedRoute({ permission: "jobs:process" }, async () =>
      Response.json({ data: { ok: true } }),
    );

    const response = await handler(new Request("http://localhost/api/jobs/process", { method: "POST" }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.code).toBe("FORBIDDEN");
  });
});
