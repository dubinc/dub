import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import { EnrolledPartnerProps } from "@/lib/types";
import { describe, expect, test } from "vitest";
import { randomPartnerEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_GROUP } from "../utils/resource";
import { verifyMergeCompleted } from "./utils/verify-merge-completed";

describe.skip("Workflow - MergePartnerAccount", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  // Creates a partner enrolled (approved) in the Acme program with a default link.
  async function createEnrolledPartner(label: string) {
    const { status, data: partner } = await http.post<EnrolledPartnerProps>({
      path: "/partners",
      body: {
        name: `E2E Merge ${label}`,
        email: randomPartnerEmail(),
        groupId: E2E_PARTNER_GROUP.id,
      },
    });

    expect(status).toEqual(201);
    expect(partner.links).not.toBeNull();
    expect(partner.links!.length).toBeGreaterThan(0);

    return partner;
  }

  test(
    "Overlap merge transfers child data and deletes source",
    { timeout: VITEST_TEST_TIMEOUT_MS },
    async () => {
      const source = await createEnrolledPartner("source");
      const target = await createEnrolledPartner("target");
      const sourceLinkId = source.links![0].id;

      const { status: triggerStatus, data: triggerRes } = await http.post<{
        workflowRunId?: string;
      }>({
        path: "/e2e/trigger-merge-account",
        body: { sourceEmail: source.email, targetEmail: target.email },
      });

      expect(triggerStatus).toEqual(200);
      expect(triggerRes).not.toBeNull();

      const merged = await verifyMergeCompleted({
        http,
        sourcePartnerId: source.id,
        targetPartnerId: target.id,
        expectedLinkId: sourceLinkId,
      });

      expect(merged.links!.map((link) => link.id)).toContain(sourceLinkId);
    },
  );

  test(
    "Overlap merge upgrades target status from pending to approved",
    { timeout: VITEST_TEST_TIMEOUT_MS },
    async () => {
      const source = await createEnrolledPartner("upgrade-source");
      const target = await createEnrolledPartner("upgrade-target");

      const { status: pendingStatus } = await http.post({
        path: "/e2e/partners/pending-program-application",
        body: { partnerId: target.id },
      });
      expect(pendingStatus).toEqual(200);

      const { status: triggerStatus } = await http.post({
        path: "/e2e/trigger-merge-account",
        body: { sourceEmail: source.email, targetEmail: target.email },
      });
      expect(triggerStatus).toEqual(200);

      const startTime = Date.now();
      let lastTargetStatus: string | undefined;

      while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
        const [sourceRes, targetRes] = await Promise.all([
          http.get({ path: `/partners/${source.id}` }),
          http.get<EnrolledPartnerProps>({ path: `/partners/${target.id}` }),
        ]);

        lastTargetStatus =
          targetRes.status === 200 ? targetRes.data.status : undefined;

        if (sourceRes.status === 404 && lastTargetStatus === "approved") {
          expect(lastTargetStatus).toBe("approved");
          return;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, VITEST_POLL_INTERVAL_MS),
        );
      }

      throw new Error(
        `Target status was not upgraded to approved within ${VITEST_TEST_TIMEOUT_MS / 1000}s. ` +
          `Last seen status: ${lastTargetStatus}`,
      );
    },
  );

  test(
    "Repeat merge is rejected once the source is already merged",
    { timeout: VITEST_TEST_TIMEOUT_MS },
    async () => {
      const source = await createEnrolledPartner("repeat-source");
      const target = await createEnrolledPartner("repeat-target");
      const sourceLinkId = source.links![0].id;

      const { status: firstTrigger } = await http.post({
        path: "/e2e/trigger-merge-account",
        body: { sourceEmail: source.email, targetEmail: target.email },
      });
      expect(firstTrigger).toEqual(200);

      await verifyMergeCompleted({
        http,
        sourcePartnerId: source.id,
        targetPartnerId: target.id,
        expectedLinkId: sourceLinkId,
      });

      const { data: afterFirst } = await http.get<EnrolledPartnerProps>({
        path: `/partners/${target.id}`,
      });
      const linkCountAfterFirst = afterFirst.links!.length;

      // The source partner no longer exists, so triggering again is rejected by
      // the guard (both partners must be enrolled in the Acme program) - the
      // merge can't be double-processed.
      const { status: secondTrigger } = await http.post({
        path: "/e2e/trigger-merge-account",
        body: { sourceEmail: source.email, targetEmail: target.email },
      });
      expect(secondTrigger).toEqual(400);

      const { data: afterSecond } = await http.get<EnrolledPartnerProps>({
        path: `/partners/${target.id}`,
      });

      expect(afterSecond.links!.length).toBe(linkCountAfterFirst);
    },
  );
});
