import { storage } from "@/lib/storage";
import { NewQrProps } from "@/lib/types";
import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";

export async function createQr(
  {
    data,
    qrType,
    title,
    description,
    styles,
    frameOptions,
    file,
    fileName,
    fileSize,
  }: NewQrProps,
  url: string,
  linkId: string,
  userId: string | null,
  fileId: string | null,
  homePageDemo?: boolean,
) {
  const isFileType = FILE_QR_TYPES.includes(qrType as EQRType);

  const qr = await prisma.qr.create({
    data: {
      id: createId({ prefix: "qr_" }),
      qrType,
      data: data,
      title,
      description,
      styles,
      frameOptions,
      linkId,
      userId,
      ...(isFileType &&
        fileId && {
          fileId,
          fileName,
          fileSize,
        }),
    },
  });

  if (isFileType && file && fileId && !homePageDemo) {
    await storage.upload(`qrs-content/${fileId}`, file);
  }

  return qr;
}
