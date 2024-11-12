import { prisma } from "@/lib/prisma";
import { DubApiError } from "../errors";

export async function getPartnerOrThrow({
  partnerId,
  userId,
}: {
  partnerId: string;
  userId: string;
}) {
  const partner = await prisma.partner.findUnique({
    where: {
      id: partnerId,
      users: { some: { userId } },
    },
  });

  if (!partner) {
    throw new DubApiError({
      code: "not_found",
      message: "Partner not found.",
    });
  }

  return { partner };
}
