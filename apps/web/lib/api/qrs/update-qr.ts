import { NewQrProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";
import { EQRType, FILE_QR_TYPES } from '@/ui/qr-builder/constants/get-qr-config';
import { storage } from '@/lib/storage';

export async function updateQr(id: string, { data, qrType, title, description, styles, frameOptions, archived, file, fileName }: Partial<NewQrProps>, fileId: string, oldFileId: string | null) {
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
    },
    include: {
      link: true,
      user: true,
    },
  });

  if (FILE_QR_TYPES.includes(qrType as EQRType) && file) {
    if (oldFileId) {
      await storage.delete(`qrs-content/${oldFileId}`);
    }
    await storage.upload(`qrs-content/${fileId}`, file);
  }

  return qr;
}
