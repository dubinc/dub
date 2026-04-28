import { generateRandomName } from "@/lib/names";
import { Partner } from "@dub/prisma/client";
import { describe, expect, test } from "vitest";
import { randomPartnerEmail } from "../../utils/helpers";
import { IntegrationHarness } from "../../utils/integration";
import { E2E_PARTNER_GROUP } from "../../utils/resource";

describe.sequential("POST /partners/applications/reject and /approve", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  test("reject then approve the same partner after E2E pending reset", async () => {
    const partner = {
      name: generateRandomName(),
      email: randomPartnerEmail(),
      groupId: E2E_PARTNER_GROUP.id,
      country: "US" as const,
    };

    const { data: created, status: createStatus } = await http.post<Partner>({
      path: "/partners",
      body: partner,
    });

    expect(createStatus).toEqual(201);
    const partnerId = created.id;

    const { status: seedStatus } = await http.post<{
      partnerId: string;
      programApplicationId: string;
      reset: boolean;
    }>({
      path: "/e2e/partners/pending-program-application",
      body: { partnerId, groupId: E2E_PARTNER_GROUP.id },
    });
    expect(seedStatus).toEqual(200);

    const { data: rejectData, status: rejectStatus } = await http.post<{
      partnerId: string;
    }>({
      path: "/partners/applications/reject",
      body: {
        partnerId,
        rejectionReason: "other",
        rejectionNote: "e2e: first rejection",
        allowImmediateReapply: false,
      },
    });
    expect(rejectStatus).toEqual(200);
    expect(rejectData.partnerId).toBe(partnerId);

    const { status: duplicateRejectStatus } = await http.post({
      path: "/partners/applications/reject",
      body: {
        partnerId,
        rejectionReason: "other",
        rejectionNote: "e2e: should fail",
        allowImmediateReapply: false,
      },
    });
    expect(duplicateRejectStatus).toEqual(400);

    const { status: resetStatus } = await http.post({
      path: "/e2e/partners/pending-program-application",
      body: { partnerId, groupId: E2E_PARTNER_GROUP.id },
    });
    expect(resetStatus).toEqual(200);

    const { data: approveData, status: approveStatus } = await http.post<{
      partnerId: string;
    }>({
      path: "/partners/applications/approve",
      body: {
        partnerId,
        groupId: E2E_PARTNER_GROUP.id,
      },
    });
    expect(approveStatus).toEqual(200);
    expect(approveData.partnerId).toBe(partnerId);

    const { data: enrolled, status: getStatus } = await http.get<{
      id: string;
      status: string;
    }>({
      path: `/partners/${partnerId}`,
    });
    expect(getStatus).toEqual(200);
    expect(enrolled.id).toBe(partnerId);
    expect(enrolled.status).toBe("approved");
  });
});
