import { NewQrProps } from "@/lib/types";
import { FILE_QR_TYPES } from "@/ui/qr-builder-new/constants/get-qr-config";
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
    logoOptions,
    archived,
    fileId,
  }: Partial<NewQrProps>,
) {
  const qr = await getQr({
    qrId: id,
  });

  const shouldClearFileId =
    qrType &&
    qr.qrType &&
    FILE_QR_TYPES.includes(qr.qrType as any) &&
    !FILE_QR_TYPES.includes(qrType as any);

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
      logoOptions: logoOptions === undefined ? null : logoOptions,
      archived: archived || false,
      fileId: shouldClearFileId ? null : fileId,
    },
    include: {
      link: true,
      user: true,
      file: true,
    },
  });

  return updatedQr;
}
