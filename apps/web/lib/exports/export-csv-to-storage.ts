import { storage } from "../storage";
import { convertToCSV } from "./convert-to-csv";
import { multipartStorage } from "./multipart-storage";

const MIN_PART_SIZE = 5 * 1024 * 1024; // 5 MB — S3/R2 minimum for non-final parts
export const SIGNED_URL_EXPIRY = 7 * 24 * 3600; // 7 days

interface ExportCsvToStorageOptions {
  fileKey: string;
  fileName: string;
  batches: AsyncIterable<object[]>;
}

interface ExportCsvToStorageResult {
  downloadUrl: string;
  rowCount: number;
}

export async function exportCsvToStorage({
  fileKey,
  fileName,
  batches,
}: ExportCsvToStorageOptions): Promise<ExportCsvToStorageResult> {
  console.log(`[csv-export] Starting export to ${fileKey}`);

  const uploadId = await multipartStorage.initiateMultipartUpload({
    key: fileKey,
    bucket: "private",
    contentType: "text/csv",
    contentDisposition: `attachment; filename="${fileName}"`,
  });

  const parts: { etag: string; partNumber: number }[] = [];
  let buffer = "";
  let partNumber = 1;
  let rowCount = 0;
  let isFirstBatch = true;

  try {
    for await (const rows of batches) {
      if (rows.length === 0) continue;

      const csvChunk = convertToCSV(rows, {
        prependHeader: isFirstBatch,
      });

      if (isFirstBatch) {
        buffer = csvChunk;
        isFirstBatch = false;
      } else {
        buffer += "\n" + csvChunk;
      }

      rowCount += rows.length;

      while (buffer.length >= MIN_PART_SIZE) {
        const chunk = buffer.slice(0, MIN_PART_SIZE);
        buffer = buffer.slice(MIN_PART_SIZE);

        const result = await multipartStorage.uploadPart({
          key: fileKey,
          uploadId,
          partNumber,
          body: chunk,
          bucket: "private",
        });

        parts.push(result);
        partNumber++;
      }
    }

    if (buffer.length > 0 || parts.length === 0) {
      const result = await multipartStorage.uploadPart({
        key: fileKey,
        uploadId,
        partNumber,
        body: buffer,
        bucket: "private",
      });
      parts.push(result);
    }

    await multipartStorage.completeMultipartUpload({
      key: fileKey,
      uploadId,
      parts,
      bucket: "private",
    });

    const downloadUrl = await storage.getSignedDownloadUrl({
      key: fileKey,
      expiresIn: SIGNED_URL_EXPIRY,
    });

    if (!downloadUrl) {
      throw new Error("Failed to generate signed download URL.");
    }

    console.log(
      `[csv-export] Export complete: ${rowCount} rows, ${parts.length} parts → ${fileKey}`,
    );

    return { downloadUrl, rowCount };
  } catch (error) {
    console.error(`[csv-export] Export failed for ${fileKey}, aborting upload`);

    await multipartStorage.abortMultipartUpload({
      key: fileKey,
      uploadId,
      bucket: "private",
    });

    throw error;
  }
}
