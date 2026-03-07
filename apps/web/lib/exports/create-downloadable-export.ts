import { storage } from "../storage";
import { SIGNED_URL_EXPIRY } from "./export-csv-to-storage";

interface CreateDownloadableExportOptions {
  fileKey: string;
  fileName: string;
  body: string;
  contentType: string;
}

export async function createDownloadableExport({
  fileKey,
  fileName,
  body,
  contentType,
}: CreateDownloadableExportOptions) {
  const blob = new Blob([body], { type: contentType });

  const uploadResult = await storage.upload({
    key: fileKey,
    body: blob,
    bucket: "private",
    opts: {
      contentType,
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    },
  });

  if (!uploadResult?.url) {
    throw new Error(`Failed to upload ${contentType} file.`);
  }

  const downloadUrl = await storage.getSignedDownloadUrl({
    key: fileKey,
    expiresIn: SIGNED_URL_EXPIRY,
  });

  if (!downloadUrl) {
    throw new Error("Failed to generate signed download URL.");
  }

  return {
    fileKey,
    downloadUrl,
  };
}
