import { createPartnerPayouts } from "@/lib/partners/create-payout";
import { prisma } from "@/lib/prisma";

// Payout are calcuated at the end of the month
export const processMonthlyPartnerPayouts = async () => {
  const partners = await prisma.programEnrollment.findMany({
    where: {
      status: "approved",
    },
  });

  if (!partners.length) {
    return;
  }

  const currentDate = new Date();

  const periodStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
  );

  const periodEnd = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
  );

  // TODO:
  // We need a batter way to handle this recursively
  for (const { programId, partnerId } of partners) {
    await createPartnerPayouts({
      programId,
      partnerId,
      periodStart,
      periodEnd,
    });
  }
};
