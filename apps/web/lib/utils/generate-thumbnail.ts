import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";
import sharp from "sharp";

export interface ThumbnailResult {
  thumbnailBlob: Blob;
  thumbnailFileId: string;
}

export async function generateThumbnail(
  file: File | Blob,
  qrType: EQRType,
): Promise<ThumbnailResult | null> {
  // Only generate thumbnails for images
  if (qrType !== EQRType.IMAGE) {
    return null;
  }

  // Handle images
  if (qrType === EQRType.IMAGE) {
    return generateImageThumbnail(file);
  }

  return null;
}

async function generateImageThumbnail(file: File | Blob): Promise<ThumbnailResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const resizedBuffer = await sharp(buffer)
      .resize(38, 38, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailBlob = new Blob([resizedBuffer], { type: "image/jpeg" });
    const thumbnailFileId = crypto.randomUUID();

    return {
      thumbnailBlob,
      thumbnailFileId,
    };
  } catch (error) {
    console.error("Error generating image thumbnail:", error);
    throw new Error("Failed to generate image thumbnail");
  }
}
