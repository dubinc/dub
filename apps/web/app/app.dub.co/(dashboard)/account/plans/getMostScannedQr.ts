"use server";

import { prisma } from "@dub/prisma";

export async function getMostScannedQr(userId: string) {
  const start = performance.now();

  // 1) pick the top link by clicks for this user
  const link = await prisma.link.findFirst({
    where: { userId },
    orderBy: { clicks: "desc" },
    select: { id: true, url: true, clicks: true },
  });
  const endLink = performance.now();
  console.log("performance 1", endLink - start);

  if (!link) {
    return null;
  }

  // 2) pick the most recent QR for that link (and user)
  const qr = await prisma.qr.findFirst({
    where: { linkId: link.id },
    select: {
      id: true,
      data: true,
      qrType: true,
      title: true,
      styles: true,
    },
  });

  const end = performance.now();
  console.log("performance 2", end - start);

  return qr
    ? { ...qr, link: { url: link.url, clicks: link.clicks } }
    : null;
}
