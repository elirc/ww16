import { describe, expect, it } from "vitest";

import { assertDealTransitionAllowed } from "@/domain/dealRegistration";

describe("assertDealTransitionAllowed", () => {
  it("blocks an invalid jump from draft straight to approved", () => {
    // Why this test matters: workflow shortcuts are one of the fastest ways to corrupt enterprise approval data.
    // Production bug caught by this test: a refactor that accidentally lets clients skip sales and channel review.
    expect(() =>
      assertDealTransitionAllowed(
        {
          userId: "demo-channel-manager",
          email: "channel-manager@example.com",
          displayName: "Casey Channel",
          role: "CHANNEL_MANAGER",
          partnerOrgId: null,
        },
        "DRAFT",
        "APPROVED",
      ),
    ).toThrow("Cannot move a deal from DRAFT to APPROVED.");
  });
});
