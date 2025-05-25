import { NewQrProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";
import { EQRType, FILE_QR_TYPES } from '@/ui/qr-builder/constants/get-qr-config';
import { storage } from '@/lib/storage';
import { R2_URL } from '@dub/utils';

export async function createQr({ data, qrType, title, description, styles, frameOptions, file }: NewQrProps, url: string, linkId: string, userId: string | null, fileId: string) {
  const qr = await prisma.qr.create({
    data: {
      id: createId({ prefix: "qr_" }),
      qrType,
      data: qrType === 'wifi' ? data : url,
      title,
      description,
      styles,
      frameOptions,
      linkId,
      userId,
      fileId,
    },
  });

  if (FILE_QR_TYPES.includes(qrType as EQRType) && file) {
    await storage.upload(`qrs-content/${fileId}`, file);
  }

  return qr;
}
