"use server";

import { prisma } from "@dub/prisma";

export async function getMostScannedQr(userId: string) {
  const qr = await prisma.qr.findFirst({
    where: {
      userId,
      archived: false,
    },
    select: {
      id: true,
      data: true,
      qrType: true,
      title: true,
      styles: true,
      link: {
        select: {
          url: true,
          clicks: true,
        },
      },
    },
  });

  return qr;
}
