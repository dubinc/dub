import { OG_AVATAR_URL, R2_URL, fetchWithTimeout } from "@dub/utils";
import { AwsClient } from "aws4fetch";

interface imageOptions {
  contentType?: string;
  width?: number;
  height?: number;
  headers?: Record<string, string>;
  access?: "public" | "private";
}

interface SignedUrlOptions {
  method?: "GET" | "PUT";
  expiresIn?: number; // in seconds
}

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

  async upload(key: string, body: Blob | Buffer | string, opts?: imageOptions) {
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

    // Set x-amz-acl header based on access parameter
    // Note: The R2 bucket is configured with public access at the bucket level,
    // so objects are publicly accessible by default. Set access: "private" to
    // restrict access to specific objects.
    if (opts?.access === "public") {
      headers["x-amz-acl"] = "public-read";
    } else if (opts?.access === "private") {
      headers["x-amz-acl"] = "private";
    }

    try {
      await this.client.fetch(`${process.env.STORAGE_ENDPOINT}/${key}`, {
        method: "PUT",
        headers,
        body: uploadBody,
      });

      return {
        url: `${R2_URL}/${key}`,
      };
    } catch (error) {
      console.error("Image upload failed", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async fetch(key: string) {
    return this.client.fetch(`${process.env.STORAGE_ENDPOINT}/${key}`);
  }

  async delete(key: string) {
    await this.client.fetch(`${process.env.STORAGE_ENDPOINT}/${key}`, {
      method: "DELETE",
    });

    return { success: true };
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions) {
    const url = new URL(`${process.env.STORAGE_ENDPOINT}/${key}`);

    // Default to 10 minutes expiration for backwards compatibility
    const expiresIn = options?.expiresIn || 600;
    url.searchParams.set("X-Amz-Expires", expiresIn.toString());

    const signed = await this.client.sign(url, {
      method: options?.method || "PUT",
      aws: {
        signQuery: true,
        allHeaders: true,
      },
    });

    return signed.url;
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
}

export const storage = new StorageClient();

export const isStored = (url: string) => {
  return url.startsWith(R2_URL) || url.startsWith(OG_AVATAR_URL);
};

export const isNotHostedImage = (imageString: string) => {
  return !imageString.startsWith("https://");
};
