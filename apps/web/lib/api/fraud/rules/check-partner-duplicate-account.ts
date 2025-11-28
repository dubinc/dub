import { prisma } from "@dub/prisma";
import { Partner } from "@dub/prisma/client";

// Checks if multiple partner accounts share the same visitor ID, indicating duplicate account creation
export async function checkPartnerDuplicateAccount(
  partner: Pick<Partner, "visitorId">,
) {
  // If no visitorId, we can't check for duplicates
  if (!partner.visitorId) {
    return false;
  }

  // Count how many partners share this visitorId
  const duplicateCount = await prisma.partner.count({
    where: {
      visitorId: partner.visitorId,
    },
  });

  // If more than 1 partner has this visitorId, it's a duplicate
  return duplicateCount > 1;
}
