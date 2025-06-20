import { EQRType } from "@/ui/qr-builder/constants/get-qr-config";

export interface ThumbnailResult {
  thumbnailBlob: Blob;
  thumbnailFileId: string;
}

export async function generateThumbnail(
  file: File | Blob,
  qrType: EQRType,
): Promise<ThumbnailResult | null> {
  // Only generate thumbnails for images and videos
  if (qrType !== EQRType.IMAGE && qrType !== EQRType.VIDEO) {
    return null;
  }

  // For now, only handle images
  if (qrType === EQRType.IMAGE) {
    return generateImageThumbnail(file);
  }

  // TODO: Implement video thumbnail generation
  // For videos, we would extract the first frame
  console.log("Video thumbnail generation not implemented yet");
  return null;
}

async function generateImageThumbnail(
  file: File | Blob,
): Promise<ThumbnailResult> {
  try {
    console.log(
      "Starting thumbnail generation for blob:",
      file.type,
      file.size,
    );

    // Test if sharp is available
    try {
      const sharp = await import("sharp");
      console.log("Sharp imported successfully:", typeof sharp.default);
    } catch (sharpError) {
      console.error("Failed to import sharp:", sharpError);
      throw new Error(`Sharp import failed: ${sharpError.message}`);
    }

    const sharp = await import("sharp");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("File converted to buffer, size:", buffer.length);

    const maxWidth = 38;
    const maxHeight = 38;

    console.log("Starting image resize with sharp...");
    const resizedBuffer = await sharp
      .default(buffer)
      .resize(maxWidth, maxHeight, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 70 })
      .toBuffer();

    console.log("Image resized, new buffer size:", resizedBuffer.length);

    const thumbnailBlob = new Blob([resizedBuffer], { type: "image/jpeg" });
    const thumbnailFileId = crypto.randomUUID();

    console.log(
      "Thumbnail created, fileId:",
      thumbnailFileId,
      "blob size:",
      thumbnailBlob.size,
    );

    return {
      thumbnailBlob,
      thumbnailFileId,
    };
  } catch (error) {
    console.error("Error generating image thumbnail:", error);
    console.error("Error stack:", error.stack);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

/**
 * Generates a thumbnail for a video file (placeholder)
 * TODO: Implement using ffmpeg.wasm or similar
 */
async function generateVideoThumbnail(
  file: File | Blob,
): Promise<ThumbnailResult | null> {
  // This would require ffmpeg.wasm or similar library
  // For now, return null
  console.log("Video thumbnail generation not implemented yet");
  return null;
}
