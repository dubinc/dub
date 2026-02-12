import { expect } from "vitest";
import { prisma } from "./prisma";

interface VerifyCommissionProps {
  customerExternalId?: string;
  invoiceId?: string;
  expectedAmount?: number;
  expectedEarnings: number;
}

const POLL_INTERVAL_MS = 5000; // 5 seconds
const TIMEOUT_MS = 30000; // 30 seconds

export const verifyCommission = async ({
  customerExternalId,
  invoiceId,
  expectedAmount,
  expectedEarnings,
}: VerifyCommissionProps) => {
  let customerId: string | undefined;

  // Resolve customer ID first if customerExternalId is given
  if (customerExternalId) {
    const customer = await prisma.customer.findFirst({
      where: { externalId: customerExternalId },
      select: { id: true },
    });

    expect(customer).not.toBeNull();
    customerId = customer!.id;
  }

  // Poll for commission every 5 seconds, timeout after 30 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    const commission = await prisma.commission.findFirst({
      where: {
        ...(customerId && { customerId }),
        ...(invoiceId && { invoiceId }),
      },
    });

    if (commission) {
      if (invoiceId) {
        expect(commission.invoiceId).toEqual(invoiceId);
      }

      if (customerId) {
        expect(commission.customerId).toEqual(customerId);
      }

      if (expectedAmount !== undefined) {
        expect(commission.amount).toEqual(expectedAmount);
      }

      expect(commission.earnings).toEqual(expectedEarnings);

      return commission;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  // Timeout reached - fail the test
  throw new Error(
    `Commission not found within ${TIMEOUT_MS / 1000} seconds. ` +
      `customerId: ${customerId}, invoiceId: ${invoiceId}`,
  );
};
