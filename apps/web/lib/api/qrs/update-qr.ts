import { storage } from "@/lib/storage";
import { NewQrProps } from "@/lib/types";
import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config";
import { prisma } from "@dub/prisma";
import { getQr } from './get-qr';

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
  fileId: string | null,
) {
  const qr = await getQr({
    qrId: id,
  });

  const isChangedFromFileToText = FILE_QR_TYPES.includes(qr.qrType as EQRType) && !FILE_QR_TYPES.includes(qrType as EQRType);

  if (isChangedFromFileToText && qr.fileId) {
    await storage.delete(`qrs-content/${qr.fileId}`);
  }

  const newFileId = file ? fileId : (isChangedFromFileToText ? null : qr.fileId);

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
      fileId: newFileId,
      fileName,
      fileSize,
    },
    include: {
      link: true,
      user: true,
    },
  });

  if (FILE_QR_TYPES.includes(qrType as EQRType) && file) {
    if (qr.fileId) {
      await storage.delete(`qrs-content/${qr.fileId}`);
    }
    await storage.upload(`qrs-content/${fileId}`, file);
  }

  return updatedQr;
}
