import { storage } from "@/lib/storage";
import { NewQrProps } from "@/lib/types";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";
import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config";
import { prisma } from "@dub/prisma";
import { createId } from "../utils";

function getMimeType(base64String: string, fileName: string): string {
  if (base64String.startsWith("data:")) {
    return base64String.split(";")[0].split(":")[1];
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "png":
    case "jpg":
    case "jpeg":
      return `image/${extension === "jpg" ? "jpeg" : extension}`;
    case "pdf":
      return "application/pdf";
    case "mp4":
    case "avi":
    case "mov":
      return `video/${extension}`;
    default:
      return "application/octet-stream";
  }
}

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
    homePageDemo,
  );

  let generatedThumbnailFileId: string | null = null;

  if (FILE_QR_TYPES.includes(qrType as EQRType) && file && !homePageDemo) {
    console.log("Starting file processing for dashboard QR creation...");

    if (file.startsWith("data:")) {
      const mimeType = getMimeType(file, fileName || "file");

      await storage.upload(`qrs-content/${fileId}`, file, {
        contentType: mimeType,
      });

      // Generate thumbnail for images and videos
      if (qrType === EQRType.IMAGE || qrType === EQRType.VIDEO) {
        console.log("Starting thumbnail generation for qrType:", qrType);
        try {
          // Convert base64 to Blob only for thumbnail generation
          const base64Data = file.replace(/^data:[^;]+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const fileBlob = new Blob([buffer], { type: mimeType });

          const thumbnailResult = await generateThumbnail(
            fileBlob,
            qrType as EQRType,
          );
          if (thumbnailResult) {
            generatedThumbnailFileId = thumbnailResult.thumbnailFileId;

            // Upload thumbnail
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
          // Don't fail the QR creation if thumbnail generation fails
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
      thumbnailFileId: finalThumbnailFileId,
    },
  });

  return qr;
}
