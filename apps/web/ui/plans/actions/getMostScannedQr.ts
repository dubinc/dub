"use server";

import { prisma } from "@dub/prisma";

export async function getMostScannedQr(userId: string) {
  const start = performance.now();

  const qr = await prisma.qr.findFirst({
    where: { userId },
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
    orderBy: { link: { clicks: "desc" } },
  });
  const endLink = performance.now();
  console.log("performance 1", endLink - start);

  return qr;
}
