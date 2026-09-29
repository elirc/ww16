import { describe, expect, it } from "vitest";

import { buildOwnedRecordVisibilityFilter } from "@/lib/auth/visibility";

describe("buildOwnedRecordVisibilityFilter", () => {
  it("scopes partner users to only their own partnerOrgId", () => {
    // Why this test matters: partner portals are especially vulnerable to cross-account data leaks when query scoping is inconsistent.
    // Production bug caught by this test: a repository change that stops filtering deal and MDF queries by the acting partner organization.
    expect(
      buildOwnedRecordVisibilityFilter({
        userId: "demo-partner-admin-acme",
        email: "partner-admin@acme.example.com",
        displayName: "Avery Partner",
        role: "PARTNER_ADMIN",
        partnerOrgId: "partner-acme",
      }),
    ).toEqual({ partnerOrgId: "partner-acme" });
  });
});
