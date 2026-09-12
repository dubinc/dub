import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import { CommissionResponse, CustomerEnriched } from "@/lib/types";
import { sleep } from "@dub/utils";
import { expect } from "vitest";

import { HttpClient } from "../../utils/http";

interface VerifyReattributeCompletedProps {
  http: HttpClient;
  oldCustomerId: string;
  newCustomerId: string;
  targetPartnerId: string;
  targetLinkId: string;
  expectTransferredCommission?: boolean;
}

/**
 * Polls until the reattribute-customer workflow has finished:
 * - the new customer is attributed to the target partner/link
 * - the old customer remains as a retired stub
 * - optional: an unpaid commission moved to the new customer
 */
export const verifyReattributeCompleted = async ({
  http,
  oldCustomerId,
  newCustomerId,
  targetPartnerId,
  targetLinkId,
  expectTransferredCommission = false,
}: VerifyReattributeCompletedProps) => {
  const startTime = Date.now();

  let lastNewPartnerId: string | undefined;
  let lastNewLinkId: string | undefined;
  let lastOldName: string | undefined;

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
    const [newRes, oldRes, commissionsRes] = await Promise.all([
      http.get<CustomerEnriched>({
        path: `/customers/${newCustomerId}`,
        query: { includeExpandedFields: "true" },
      }),
      http.get<CustomerEnriched>({
        path: `/customers/${oldCustomerId}`,
        query: { includeExpandedFields: "true" },
      }),
      expectTransferredCommission
        ? http.get<CommissionResponse[]>({
            path: "/commissions",
            query: { customerId: newCustomerId },
          })
        : Promise.resolve({ status: 200, data: [] as CommissionResponse[] }),
    ]);

    lastNewPartnerId =
      newRes.status === 200 ? newRes.data.partner?.id : undefined;
    lastNewLinkId = newRes.status === 200 ? newRes.data.link?.id : undefined;
    lastOldName =
      oldRes.status === 200 ? oldRes.data.name ?? undefined : undefined;

    const newAttributed =
      newRes.status === 200 &&
      lastNewPartnerId === targetPartnerId &&
      lastNewLinkId === targetLinkId;

    const oldStubbed =
      oldRes.status === 200 &&
      Boolean(oldRes.data.name?.endsWith(" (old)")) &&
      !oldRes.data.partner &&
      oldRes.data.stripeCustomerId == null;

    const commissionMoved =
      !expectTransferredCommission ||
      (commissionsRes.status === 200 &&
        commissionsRes.data.some(
          (commission) =>
            commission.customer?.id === newCustomerId &&
            commission.partner?.id === targetPartnerId,
        ));

    if (newAttributed && oldStubbed && commissionMoved) {
      expect(lastNewPartnerId).toBe(targetPartnerId);
      expect(lastNewLinkId).toBe(targetLinkId);
      expect(oldRes.data.name).toMatch(/ \(old\)$/);
      return {
        newCustomer: newRes.data,
        oldCustomer: oldRes.data,
      };
    }

    await sleep(VITEST_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Reattribution did not complete within ${VITEST_TEST_TIMEOUT_MS / 1000}s. ` +
      `newCustomerId: ${newCustomerId} (partner: ${lastNewPartnerId}, link: ${lastNewLinkId}), ` +
      `oldCustomerId: ${oldCustomerId} (name: ${lastOldName}).`,
  );
};
