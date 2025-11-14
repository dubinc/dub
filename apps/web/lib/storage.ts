import { OG_AVATAR_URL, R2_URL, fetchWithTimeout } from "@dub/utils";
import { AwsClient } from "aws4fetch";

interface imageOptions {
  contentType?: string;
  width?: number;
  height?: number;
  headers?: Record<string, string>;
}

type BucketType = "public" | "private";

class StorageClient {
  private client: AwsClient;

  constructor() {
    this.client = new AwsClient({
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || "",
      service: "s3",
      region: "auto",
    });
  }

  async upload({
    key,
    body,
    opts,
    bucket = "public",
  }: {
    key: string;
    body: Blob | Buffer | string;
    opts?: imageOptions;
    bucket?: BucketType;
  }) {
    let uploadBody;
    if (typeof body === "string") {
      if (this.isBase64(body)) {
        uploadBody = this.base64ToArrayBuffer(body, opts);
      } else if (this.isUrl(body)) {
        uploadBody = await this.urlToBlob(body, opts);
      } else {
        throw new Error("Invalid input: Not a base64 string or a valid URL");
      }
    } else {
      uploadBody = body;
    }

    const headers = {
      "Content-Length": uploadBody.size.toString(),
      ...opts?.headers,
    };

    if (opts?.contentType) {
      headers["Content-Type"] = opts.contentType;
    }

    try {
      const response = await this.client.fetch(
        `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}`,
        {
          method: "PUT",
          headers,
          body: uploadBody,
        },
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return {
        url: `${R2_URL}/${key}`,
      };
    } catch (error) {
      console.error("storage.upload failed", error);
      throw new Error("Failed to upload file. Please try again later.");
    }
  }

  async delete({
    key,
    bucket = "public",
  }: {
    key: string;
    bucket?: BucketType;
  }) {
    try {
      const response = await this.client.fetch(
        `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }
    } catch (error) {
      console.error("storage.delete failed", error);
      throw new Error("Failed to delete file. Please try again later.");
    }
  }

  async getSignedUrl({
    key,
    method,
    expiresIn,
    bucket,
  }: {
    key: string;
    method: "PUT" | "GET";
    bucket: BucketType;
    expiresIn: number;
  }) {
    const url = new URL(
      `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}`,
    );

    url.searchParams.set("X-Amz-Expires", String(expiresIn));

    try {
      const response = await this.client.sign(url, {
        method,
        aws: {
          signQuery: true,
          allHeaders: true,
        },
      });

      return response.url;
    } catch (error) {
      console.error("storage.getSignedUrl failed", error);
      throw new Error("Failed to generate signed url. Please try again later.");
    }
  }

  async getSignedUploadUrl(opts: {
    key: string;
    bucket?: BucketType;
    expiresIn?: number;
  }) {
    return await this.getSignedUrl({
      key: opts.key,
      method: "PUT",
      bucket: opts.bucket || "public",
      expiresIn: opts.expiresIn || 600,
    });
  }

  async getSignedDownloadUrl(opts: {
    key: string;
    bucket?: BucketType;
    expiresIn?: number;
  }) {
    return await this.getSignedUrl({
      key: opts.key,
      method: "GET",
      bucket: opts.bucket || "private",
      expiresIn: opts.expiresIn || 600,
    });
  }

  private base64ToArrayBuffer(base64: string, opts?: imageOptions) {
    const base64Data = base64.replace(/^data:.+;base64,/, "");
    const paddedBase64Data = base64Data.padEnd(
      base64Data.length + ((4 - (base64Data.length % 4)) % 4),
      "=",
    );

    const binaryString = atob(paddedBase64Data);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      byteArray[i] = binaryString.charCodeAt(i);
    }
    const blobProps = {};
    if (opts?.contentType) blobProps["type"] = opts.contentType;
    return new Blob([byteArray], blobProps);
  }

  private isBase64(str: string) {
    const base64Regex =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    const dataImageRegex =
      /^data:image\/[a-zA-Z0-9.+-]+;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    return base64Regex.test(str) || dataImageRegex.test(str);
  }

  private isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch (_) {
      return false;
    }
  }

  private async urlToBlob(url: string, opts?: imageOptions): Promise<Blob> {
    let response: Response;
    if (opts?.height || opts?.width) {
      try {
        const proxyUrl = new URL("https://wsrv.nl");
        proxyUrl.searchParams.set("url", url);
        if (opts.width) proxyUrl.searchParams.set("w", opts.width.toString());
        if (opts.height) proxyUrl.searchParams.set("h", opts.height.toString());
        proxyUrl.searchParams.set("fit", "cover");
        response = await fetchWithTimeout(proxyUrl.toString());
      } catch (error) {
        response = await fetch(url);
      }
    } else {
      response = await fetch(url);
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const blob = await response.blob();
    if (opts?.contentType) {
      return new Blob([blob], { type: opts.contentType });
    }
    return blob;
  }

  private _getBucketName(bucket: BucketType) {
    if (bucket === "public") {
      const bucketName = process.env.STORAGE_PUBLIC_BUCKET;

      if (!bucketName) {
        throw new Error("STORAGE_PUBLIC_BUCKET is not set");
      }

      return bucketName;
    }

    if (bucket === "private") {
      const bucketName = process.env.STORAGE_PRIVATE_BUCKET;

      if (!bucketName) {
        throw new Error("STORAGE_PRIVATE_BUCKET is not set");
      }

      return bucketName;
    }

    throw new Error(`Invalid bucket type: ${bucket}`);
  }
}

export const storage = new StorageClient();

export const isStored = (url: string) => {
  return url.startsWith(R2_URL) || url.startsWith(OG_AVATAR_URL);
};

export const isNotHostedImage = (imageString: string) => {
  return !imageString.startsWith("https://");
};
