"use server";

import z from "@/lib/zod";
import { getLinksQuerySchemaBase } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";

export async function getMostScannedQr(userId: string) {
  const qrs = await prisma.qr.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      data: true,
      qrType: true,
      title: true,
      styles: true,
      frameOptions: true,
      link: {
        select: {
          id: true,
          url: true,
          clicks: true,
        },
      },
    },
    orderBy: {
      link: {
        clicks: 'desc',
      },
    },
    take: 1,
  });

  return qrs;
}
