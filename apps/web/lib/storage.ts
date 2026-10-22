import { DubApiError } from "@/lib/api/errors";
import { isPrivateIp } from "@/lib/api/is-private-ip";
import { assertSafeStorageKey } from "@/lib/storage/assert-safe-storage-key";
import { OG_AVATAR_URL, R2_URL, fetchWithTimeout } from "@dub/utils";
import { AwsClient } from "aws4fetch";
import { promises as dns } from "dns";
import { isIP } from "net";

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
        throw invalidSourceError(
          "Invalid input: Not a base64 string or a valid URL",
        );
      }
    } else {
      uploadBody = body;
    }

    const headers = {
      "Content-Length": String(
        uploadBody instanceof Blob ? uploadBody.size : uploadBody.byteLength,
      ),
      ...opts?.headers,
    };

    if (opts?.contentType) {
      headers["Content-Type"] = opts.contentType;
    }

    const requestUrl = this.objectRequestUrl(key, bucket);

    try {
      const response = await this.client.fetch(requestUrl, {
        method: "PUT",
        headers,
        body: uploadBody,
      });

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
    const requestUrl = this.objectRequestUrl(key, bucket);

    try {
      const response = await this.client.fetch(requestUrl, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }
    } catch (error) {
      console.error("storage.delete failed", error);
      throw new Error("Failed to delete file. Please try again later.");
    }
  }

  // Fetch object metadata (Content-Type, size, eTag) without downloading the body
  async head({ key, bucket = "public" }: { key: string; bucket?: BucketType }) {
    const response = await this.client.fetch(
      this.objectRequestUrl(key, bucket),
      {
        method: "HEAD",
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `storage.head failed (${response.status}): ${response.statusText}`,
      );
    }

    const contentLengthHeader = response.headers.get("content-length");

    return {
      contentType: response.headers.get("content-type"),
      contentLength: contentLengthHeader
        ? Number.parseInt(contentLengthHeader, 10)
        : null,
      eTag: response.headers.get("etag"),
    };
  }

  // Read the first N bytes of an object (for magic-byte sniffing)
  async getBytes({
    key,
    bucket = "public",
    length = 4100,
  }: {
    key: string;
    bucket?: BucketType;
    length?: number;
  }) {
    const response = await this.client.fetch(
      this.objectRequestUrl(key, bucket),
      {
        method: "GET",
        headers: {
          Range: `bytes=0-${Math.max(length - 1, 0)}`,
        },
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok && response.status !== 206) {
      throw new Error(
        `storage.getBytes failed (${response.status}): ${response.statusText}`,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  async getSignedUrl({
    key,
    method,
    expiresIn,
    bucket,
    headers,
  }: {
    key: string;
    method: "PUT" | "GET";
    bucket: BucketType;
    expiresIn: number;
    headers?: Record<string, string>;
  }) {
    const url = new URL(this.objectRequestUrl(key, bucket));

    url.searchParams.set("X-Amz-Expires", String(expiresIn));

    try {
      const response = await this.client.sign(url, {
        method,
        headers,
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
    contentLength?: number;
    contentType?: string;
  }) {
    const headers: Record<string, string> = {};

    if (opts.contentLength) {
      headers["Content-Length"] = String(opts.contentLength);
    }

    if (opts.contentType) {
      headers["Content-Type"] = opts.contentType;
    }

    return await this.getSignedUrl({
      key: opts.key,
      method: "PUT",
      bucket: opts.bucket || "public",
      expiresIn: opts.expiresIn || 600,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
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

  // Uses the same deny-list as `safeFetch` in `lib/api/safe-fetch.ts`.
  private async assertSafeUrl(url: string): Promise<void> {
    const { hostname, protocol } = new URL(url);

    if (protocol !== "http:" && protocol !== "https:") {
      throw invalidSourceError("Only http and https URLs are allowed.");
    }

    let address: string;
    if (isIP(hostname) !== 0) {
      address = hostname;
    } else {
      const result = await dns.lookup(hostname);
      address = result.address;
    }

    if (isPrivateIp(address)) {
      throw invalidSourceError(
        "URL resolves to a private or internal IP address.",
      );
    }
  }

  private async safeFetch(url: string): Promise<Response> {
    const maxRedirects = 5;
    let currentUrl = url;

    for (
      let redirectCount = 0;
      redirectCount <= maxRedirects;
      redirectCount++
    ) {
      await this.assertSafeUrl(currentUrl);

      const response = await fetchWithTimeout(currentUrl, {
        redirect: "manual",
      });

      if (response.ok) {
        return response;
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          throw invalidSourceError("Redirect response missing location header");
        }
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }

      throw invalidSourceError(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    throw invalidSourceError("Too many redirects");
  }

  private async urlToBlob(url: string, opts?: imageOptions): Promise<Blob> {
    let blob: Blob | undefined;

    try {
      if (opts?.height || opts?.width) {
        // Resize through the wsrv.nl proxy. A proxy failure is not the caller's fault, so any
        // proxy error or error status falls back to the direct fetch below, which judges the URL.
        try {
          const proxyUrl = new URL("https://wsrv.nl");
          proxyUrl.searchParams.set("url", url);
          if (opts.width) proxyUrl.searchParams.set("w", opts.width.toString());
          if (opts.height)
            proxyUrl.searchParams.set("h", opts.height.toString());
          proxyUrl.searchParams.set("fit", "cover");
          const proxyResponse = await fetchWithTimeout(proxyUrl.toString());
          if (proxyResponse.ok) {
            blob = await proxyResponse.blob();
          }
        } catch (error) {
          blob = undefined;
        }
      }

      if (!blob) {
        // safeFetch returns only a successful response and throws for the others
        const response = await this.safeFetch(url);
        blob = await response.blob();
      }
    } catch (error) {
      if (error instanceof DubApiError) {
        throw error;
      }

      // A host that does not resolve, a refused connection, a timeout or a dropped connection
      // while the body is read, on the caller's URL
      throw invalidSourceError(
        `Failed to fetch URL: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (opts?.contentType) {
      return new Blob([blob], { type: opts.contentType });
    }
    return blob;
  }

  private objectRequestUrl(key: string, bucket: BucketType) {
    assertSafeStorageKey(key);

    return `${process.env.STORAGE_ENDPOINT}/${this._getBucketName(bucket)}/${key}`;
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

// A problem with the body or URL that the caller passed to upload(). It is a client error, so
// handleApiError returns 400 and server actions show the message, for every caller of upload().
function invalidSourceError(message: string) {
  return new DubApiError({
    code: "bad_request",
    message,
  });
}

export const storage = new StorageClient();

export const isStored = (url: string) => {
  return url.startsWith(R2_URL) || url.startsWith(OG_AVATAR_URL);
};

export const isNotHostedImage = (imageString: string) => {
  return !imageString.startsWith("https://");
};
