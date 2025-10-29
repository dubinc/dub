import { storage } from "../storage";

interface CreateDownloadableExportOptions {
  fileKey: string;
  fileName: string;
  body: string;
  contentType: string;
}

const expiresIn = 7 * 24 * 3600; // 7 days

// Upload the .csv file to R2 and return a signed link to download it
export async function createDownloadableExport({
  fileKey,
  fileName,
  body,
  contentType,
}: CreateDownloadableExportOptions) {
  const blob = new Blob([body], { type: contentType });

  // Upload
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

  // Generate a signed download URL
  const downloadUrl = await storage.getSignedDownloadUrl({
    key: fileKey,
    expiresIn,
  });

  if (!downloadUrl) {
    throw new Error("Failed to generate signed download URL.");
  }

  return {
    fileKey,
    downloadUrl,
  };
}
