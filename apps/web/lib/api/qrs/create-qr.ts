import { NewQrProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";
import { EQRType } from '@/ui/qr-builder/constants/get-qr-config';

export async function createQr(
  {
    data,
    qrType,
    title,
    description,
    styles,
    frameOptions,
    fileId,
  }: NewQrProps,
  url: string,
  linkId: string,
  userId: string | null,
) {
  const qr = await prisma.qr.create({
    data: {
      id: createId({ prefix: "qr_" }),
      qrType,
      data: qrType === EQRType.WIFI ? data : url,
      title,
      description,
      styles,
      frameOptions,
      linkId,
      userId,
      fileId,
    },
  });

  return qr;
}
