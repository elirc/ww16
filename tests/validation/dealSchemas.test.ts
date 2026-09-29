import { describe, expect, it } from "vitest";

import { createDealSchema } from "@/lib/validation/dealSchemas";

describe("createDealSchema", () => {
  it("rejects a negative ARR value at the validation boundary", () => {
    // Why this test matters: invalid money values should never enter workflow logic because downstream approvals and reports will trust them.
    // Production bug caught by this test: a malformed API client creating negative pipeline or nonsense forecast totals.
    expect(() =>
      createDealSchema.parse({
        partnerOrgId: "partner-acme",
        endCustomerName: "Bad Input Corp",
        projectedArr: -500,
        closeDate: "2026-08-01",
      }),
    ).toThrow();
  });
});
