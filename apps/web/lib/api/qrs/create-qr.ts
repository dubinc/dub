import { NewQrProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";

export async function createQr({ data, qrType, title, description, styles, frameOptions }: NewQrProps, linkId: string, userId: string | null) {
  const qr = await prisma.qr.create({
    data: {
      id: createId({ prefix: "qr_" }),
      qrType,
      data,
      title,
      description,
      styles,
      frameOptions,
      linkId,
      userId,
    },
  });

  return qr;
}
