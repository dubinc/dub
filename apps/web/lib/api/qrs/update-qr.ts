import { NewQrProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";

export async function updateQr(id: string, { data, qrType, title, description, styles, frameOptions, archived }: Partial<NewQrProps>) {
  const qr = await prisma.qr.update({
    where: {
      id,
    },
    data: {
      qrType,
      data,
      title,
      description,
      styles,
      frameOptions,
      archived: archived || false,
    },
    include: {
      link: true,
      user: true,
    },
  });

  return qr;
}
