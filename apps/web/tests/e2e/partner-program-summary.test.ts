import { afterAll, describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe.sequential("Partner program summary (E2E)", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  let programIdFromSetup: string;
  let partnerIdFromSetup: string;

  afterAll(async () => {
    if (partnerIdFromSetup) {
      await h.deletePartnerProgramSummaryE2ePartner(partnerIdFromSetup);
    }
  });

  test("Eligible partner appears in program summary cohort after setup", async () => {
    const { data: created, status: createStatus } = await http.post<{
      programId: string;
      partnerId: string;
      enrollmentId: string;
      linkId: string;
    }>({
      path: "/e2e/partner-program-summary",
      body: {
        monthlyProgramSummary: true,
        ensureMinLeads: 1,
      },
    });

    expect(createStatus).toEqual(200);
    expect(created.partnerId).toBeTruthy();
    expect(created.programId).toBeTruthy();
    expect(created.linkId).toBeTruthy();
    programIdFromSetup = created.programId;
    partnerIdFromSetup = created.partnerId;

    const { data: snapshot, status: getStatus } = await http.get<{
      programId: string;
      count: number;
      partnerIds: string[];
      eligible?: boolean;
    }>({
      path: "/e2e/partner-program-summary",
      query: {
        programId: programIdFromSetup,
        partnerId: partnerIdFromSetup,
      },
    });

    expect(getStatus).toEqual(200);
    expect(snapshot.count).toBeGreaterThanOrEqual(1);
    expect(snapshot.partnerIds).toContain(partnerIdFromSetup);
    expect(snapshot.eligible).toBe(true);
  });

  test("Partner leaves cohort when monthlyProgramSummary is disabled", async () => {
    await http.post({
      path: "/e2e/partner-program-summary",
      body: {
        partnerId: partnerIdFromSetup,
        monthlyProgramSummary: false,
        ensureMinLeads: 1,
      },
    });

    const { data, status } = await http.get<{
      programId: string;
      count: number;
      partnerIds: string[];
      eligible?: boolean;
    }>({
      path: "/e2e/partner-program-summary",
      query: {
        programId: programIdFromSetup,
        partnerId: partnerIdFromSetup,
      },
    });

    expect(status).toEqual(200);
    expect(data.partnerIds).not.toContain(partnerIdFromSetup);
    expect(data.eligible).toBe(false);
  });

  test("Re-enabling monthlyProgramSummary restores eligibility", async () => {
    const { status } = await http.post({
      path: "/e2e/partner-program-summary",
      body: {
        partnerId: partnerIdFromSetup,
        monthlyProgramSummary: true,
        ensureMinLeads: 1,
      },
    });

    expect(status).toEqual(200);

    const { data, status: getStatus } = await http.get<{
      eligible?: boolean;
      partnerIds: string[];
    }>({
      path: "/e2e/partner-program-summary",
      query: {
        programId: programIdFromSetup,
        partnerId: partnerIdFromSetup,
      },
    });

    expect(getStatus).toEqual(200);
    expect(data.partnerIds).toContain(partnerIdFromSetup);
    expect(data.eligible).toBe(true);
  });
});
