import { AwsClient } from "aws4fetch";

type Bucket = "dubassets" | "dubassets-private";

class StorageV2 {
  private client: AwsClient;

  constructor() {
    this.client = new AwsClient({
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || "",
      service: "s3",
      region: "auto",
    });
  }

  private getEndpoint(bucket: Bucket, key: string) {
    return `${process.env.PRIVATE_STORAGE_ENDPOINT}/${bucket}/${key}`;
  }

  async upload({
    bucket = "dubassets-private",
    key,
    body,
    contentType = "text/csv",
    headers = {},
  }: {
    bucket?: Bucket;
    key: string;
    body: Buffer | Blob;
    contentType?: string;
    headers?: Record<string, string>;
  }) {
    const finalHeaders: Record<string, string> = {
      "Content-Type": contentType,
      ...headers,
    };

    let uploadBody: Blob;
    if (Buffer.isBuffer(body)) {
      uploadBody = new Blob([new Uint8Array(body)], { type: contentType });
      finalHeaders["Content-Length"] = body.length.toString();
    } else {
      uploadBody = body;
      finalHeaders["Content-Length"] = body.size.toString();
    }

    try {
      const url = this.getEndpoint(bucket, key);

      await this.client.fetch(url, {
        method: "PUT",
        headers: finalHeaders,
        body: uploadBody,
      });

      return {
        url,
        key,
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async getSignedDownloadUrl({
    bucket = "dubassets-private",
    key,
    expiresIn = 600, // 10 minutes
  }: {
    bucket?: Bucket;
    key: string;
    expiresIn?: number;
  }) {
    const url = new URL(this.getEndpoint(bucket, key));

    // Set expiration in seconds
    url.searchParams.set("X-Amz-Expires", expiresIn.toString());

    const signed = await this.client.sign(url, {
      method: "GET",
      aws: {
        signQuery: true,
        allHeaders: true,
      },
    });

    return signed.url;
  }
}

export const storageV2 = new StorageV2();
