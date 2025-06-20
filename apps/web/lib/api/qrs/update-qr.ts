import { storage } from "@/lib/storage";
import { NewQrProps } from "@/lib/types";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";
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
  let thumbnailFileId: string | null = null;

  // Handle file upload and thumbnail generation
  if (FILE_QR_TYPES.includes(qrType as EQRType) && file) {
    if (oldFileId) {
      await storage.delete(`qrs-content/${oldFileId}`);

      // Also delete old thumbnail if it exists
      const oldQr = await prisma.qr.findUnique({
        where: { id },
        select: { thumbnailFileId: true },
      });
      if (oldQr?.thumbnailFileId) {
        await storage.delete(`qrs-content/${oldQr.thumbnailFileId}`);
      }
    }

    await storage.upload(`qrs-content/${fileId}`, file);

    // Generate thumbnail for images
    if (qrType === EQRType.IMAGE) {
      try {
        const base64Data = file.replace(/^data:[^;]+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const fileBlob = new Blob([buffer]);

        const thumbnailResult = await generateThumbnail(
          fileBlob,
          qrType as EQRType,
        );
        if (thumbnailResult) {
          thumbnailFileId = thumbnailResult.thumbnailFileId;

          // Upload thumbnail
          await storage.upload(
            `qrs-content/${thumbnailFileId}`,
            thumbnailResult.thumbnailBlob,
            {
              contentType: "image/jpeg",
            },
          );

          console.log("Thumbnail uploaded:", thumbnailFileId);
        }
      } catch (error) {
        console.error("Error generating thumbnail:", error);
        // Don't fail the QR update if thumbnail generation fails
      }
    }
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
      thumbnailFileId: thumbnailFileId || undefined,
    },
    include: {
      link: true,
      user: true,
    },
  });

  return qr;
}
