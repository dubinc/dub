"use server";

import { prisma } from "@dub/prisma";

export async function getMostScannedQr(userId: string) {
  const start = performance.now();

  // 1) pick the top link by clicks for this user
  const link = await prisma.link.findFirst({
    where: { userId },
    orderBy: { clicks: "desc" },
    select: {
      id: true,
      url: true,
      clicks: true,
      qrs: {
        select: {
          id: true,
          data: true,
          qrType: true,
          title: true,
          styles: true,
        },
        take: 1,
      },
    },
  });
  const endLink = performance.now();
  console.log("performance 1", endLink - start);

  return link?.qrs[0]
    ? { ...link.qrs[0], link: { url: link.url, clicks: link.clicks } }
    : null;
}
