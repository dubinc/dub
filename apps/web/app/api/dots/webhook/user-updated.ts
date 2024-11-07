import { prisma } from "@/lib/prisma";

export async function userUpdated(body: any) {
  const { user_id, metadata } = body;

  if (metadata?.partnerId) {
    await prisma.partner.update({
      where: { id: metadata.partnerId },
      data: { dotsUserId: user_id },
    });
    return `Updated partner ${metadata.partnerId} with dots user ID ${user_id}`;
  }

  return `Partner ID not found for dots user ${user_id}`;
}
