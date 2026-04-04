import { type BucketType, StorageClient } from "./storage";

class MultipartStorageClient extends StorageClient {
  async initiateMultipartUpload({
    key,
    bucket = "private",
    contentType,
    contentDisposition,
  }: {
    key: string;
    bucket?: BucketType;
    contentType?: string;
    contentDisposition?: string;
  }): Promise<string> {
    const url = `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}?uploads`;

    const headers: Record<string, string> = {};
    if (contentType) headers["Content-Type"] = contentType;
    if (contentDisposition) headers["Content-Disposition"] = contentDisposition;

    console.log(`[multipart-upload] Initiating upload for ${key}`);

    const response = await this.client.fetch(url, {
      method: "POST",
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to initiate multipart upload: ${response.statusText}`,
      );
    }

    const xml = await response.text();
    const uploadId = xml.match(/<UploadId>(.+?)<\/UploadId>/)?.[1];

    if (!uploadId) {
      throw new Error(
        "Failed to parse UploadId from multipart upload response",
      );
    }

    console.log(
      `[multipart-upload] Upload initiated for ${key} (uploadId: ${uploadId})`,
    );
    return uploadId;
  }

  async uploadPart({
    key,
    uploadId,
    partNumber,
    body,
    bucket = "private",
  }: {
    key: string;
    uploadId: string;
    partNumber: number;
    body: string | Blob;
    bucket?: BucketType;
  }): Promise<{ etag: string; partNumber: number }> {
    const url = `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}?partNumber=${partNumber}&uploadId=${uploadId}`;

    const blob =
      body instanceof Blob ? body : new Blob([body], { type: "text/csv" });

    console.log(
      `[multipart-upload] Uploading part ${partNumber} (${blob.size} bytes) for ${key}`,
    );

    const response = await this.client.fetch(url, {
      method: "PUT",
      headers: {
        "Content-Length": blob.size.toString(),
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to upload part ${partNumber}: ${response.statusText}`,
      );
    }

    const etag = response.headers.get("etag");

    if (!etag) {
      throw new Error(`Missing ETag in response for part ${partNumber}`);
    }

    return { etag, partNumber };
  }

  async completeMultipartUpload({
    key,
    uploadId,
    parts,
    bucket = "private",
  }: {
    key: string;
    uploadId: string;
    parts: { etag: string; partNumber: number }[];
    bucket?: BucketType;
  }): Promise<void> {
    const url = `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}?uploadId=${uploadId}`;

    const xml = `<CompleteMultipartUpload>${parts.map((p) => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`).join("")}</CompleteMultipartUpload>`;

    const response = await this.client.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: xml,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to complete multipart upload: ${response.statusText}`,
      );
    }

    console.log(
      `[multipart-upload] Completed upload for ${key} (${parts.length} parts)`,
    );
  }

  async abortMultipartUpload({
    key,
    uploadId,
    bucket = "private",
  }: {
    key: string;
    uploadId: string;
    bucket?: BucketType;
  }): Promise<void> {
    try {
      const url = `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}?uploadId=${uploadId}`;

      await this.client.fetch(url, {
        method: "DELETE",
      });

      console.log(`[multipart-upload] Aborted upload for ${key}`);
    } catch (error) {
      console.error(
        `[multipart-upload] Failed to abort upload for ${key}:`,
        error,
      );
    }
  }
}

export const multipartStorage = new MultipartStorageClient();
