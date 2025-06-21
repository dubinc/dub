import { storage } from "@/lib/storage";
import { NewQrProps } from "@/lib/types";
import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config";
import { prisma } from "@dub/prisma";

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
    file,
    fileName,
    fileSize,
  }: Partial<NewQrProps>,
  fileId: string,
  oldFileId: string | null,
) {
  if (FILE_QR_TYPES.includes(qrType as EQRType) && file) {
    if (oldFileId) {
      await storage.delete(`qrs-content/${oldFileId}`);
    }

    await storage.upload(`qrs-content/${fileId}`, file);
  }

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
      fileId: file ? fileId : oldFileId,
      fileName,
      fileSize,
    },
    include: {
      link: true,
      user: true,
    },
  });

  return qr;
}
