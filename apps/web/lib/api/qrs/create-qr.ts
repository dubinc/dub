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
  fileId: string,
  homePageDemo?: boolean,
) {
  console.log(
    "creating QR",
    data,
    qrType,
    title,
    description,
    styles,
    frameOptions,
    file,
    fileName,
    fileSize,
    homePageDemo,
  );
  const qr = await prisma.qr.create({
    data: {
      id: createId({ prefix: "qr_" }),
      qrType,
      data: data, // @TODO: check with guys why it was a link url and that we can use data as we need to display real data in dashboard
      title,
      description,
      styles,
      frameOptions,
      linkId,
      userId,
      fileId,
      fileName,
      fileSize,
    },
  });

  if (FILE_QR_TYPES.includes(qrType as EQRType) && file && !homePageDemo) {
    await storage.upload(`qrs-content/${fileId}`, file);
  }

  return qr;
}
