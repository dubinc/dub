import { NewQrProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { getQr } from "./get-qr";

export async function updateQr(
  id: string,
  {
    data,
    qrType,
    title,
    description,
    styles,
    frameOptions,
    archived,
    fileId,
  }: Partial<NewQrProps>,
) {
  const qr = await getQr({
    qrId: id,
  });

  const updatedQr = await prisma.qr.update({
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
      fileId,
    },
    include: {
      link: true,
      user: true,
      file: true,
    },
  });

  return updatedQr;
}
