import { PayoutSchema } from "@/lib/zod/schemas/payouts";
import { prisma } from "@dub/prisma";
import { DubApiError } from "../errors";

export async function getPayoutOrThrow({
  payoutId,
  programId,
}: {
  payoutId: string;
  programId: string;
}) {
  const payout = await prisma.payout.findUnique({
    where: {
      id: payoutId,
    },
  });

  if (!payout) {
    throw new DubApiError({
      code: "not_found",
      message: "Payout not found.",
    });
  }

  if (payout.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: "Payout does not belong to the program.",
    });
  }
  return PayoutSchema.parse(payout);
}
