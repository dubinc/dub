"use server";

import { prisma } from "@dub/prisma";

export async function getMostScannedQr(userId: string) {
  const start = performance.now();
  const qr = await prisma.qr.findFirst({
    where: {
      link: {
        userId,
      },
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
    orderBy: [
      {
        link: {
          clicks: "desc",
        },
      },
      { createdAt: "desc" },
    ],
  });
  const end = performance.now();
  console.log("performance", end - start);

  return qr;
}
