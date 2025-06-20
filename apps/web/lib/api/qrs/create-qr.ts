import { storage } from "@/lib/storage";
import { NewQrProps } from "@/lib/types";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";
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
  thumbnailFileId?: string,
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

  let generatedThumbnailFileId: string | null = null;

  if (FILE_QR_TYPES.includes(qrType as EQRType) && file && !homePageDemo) {
    console.log("Starting file processing for dashboard QR creation...");

    if (file.startsWith("data:")) {
      await storage.upload(`qrs-content/${fileId}`, file);

      // Generate thumbnail for images
      if (qrType === EQRType.IMAGE) {
        console.log("Starting thumbnail generation for qrType:", qrType);
        try {
          const base64Data = file.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const fileBlob = new Blob([buffer]);

          const thumbnailResult = await generateThumbnail(
            fileBlob,
            qrType as EQRType,
          );
          if (thumbnailResult) {
            generatedThumbnailFileId = thumbnailResult.thumbnailFileId;

            await storage.upload(
              `qrs-content/${generatedThumbnailFileId}`,
              thumbnailResult.thumbnailBlob,
              {
                contentType: "image/jpeg",
              },
            );

            console.log("Thumbnail uploaded:", generatedThumbnailFileId);
          }
        } catch (error) {
          console.error("Error generating thumbnail:", error);
        }
      } else {
        console.log("Skipping thumbnail generation for qrType:", qrType);
      }
    } else {
      console.error("Dashboard flow expects base64 file, got:", typeof file);
      return null;
    }
  } else {
    console.log("Skipping file processing - conditions not met:", {
      isFileType: FILE_QR_TYPES.includes(qrType as EQRType),
      hasFile: !!file,
      isHomePageDemo: homePageDemo,
    });
  }

  // Use passed thumbnailFileId if provided (for landing page flow), otherwise use generated one
  const finalThumbnailFileId = thumbnailFileId || generatedThumbnailFileId;

  const qr = await prisma.qr.create({
    data: {
      id: createId({ prefix: "qr_" }),
      qrType,
      data: qrType === "wifi" ? data : url,
      title,
      description,
      styles,
      frameOptions,
      linkId,
      userId,
      fileId,
      fileName,
      fileSize,
      thumbnailFileId: finalThumbnailFileId,
    },
  });

  return qr;
}
