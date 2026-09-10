import { DubApiError } from "@/lib/api/errors";
import { storage } from "@/lib/storage";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { UPLOAD_POLICIES } from "@/lib/storage/upload-policies";
import { R2_URL } from "@dub/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/storage", () => ({
  storage: {
    getSignedUploadUrl: vi.fn(),
  },
}));

const getSignedUploadUrlMock = vi.mocked(storage.getSignedUploadUrl);

describe("createSignedUploadUrl", () => {
  const key = "programs/prog_123/lander/image_abc";
  const signedUrl = "https://signed.example.test/upload";

  beforeEach(() => {
    getSignedUploadUrlMock.mockReset();
    getSignedUploadUrlMock.mockResolvedValue(signedUrl);
  });

  it("returns a signed URL and destination URL for an allowed upload", async () => {
    const result = await createSignedUploadUrl({
      key,
      policy: "programLanderImages",
      contentType: "image/svg+xml",
      contentLength: 1024,
    });

    expect(result).toEqual({
      key,
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    });
    expect(getSignedUploadUrlMock).toHaveBeenCalledWith({
      key,
      bucket: "public",
      contentType: "image/svg+xml",
      contentLength: 1024,
    });
  });

  it("forwards the private bucket to the signer", async () => {
    await createSignedUploadUrl({
      key: "messages/prog_123/file.pdf",
      policy: "programMessageAttachments",
      contentType: "application/pdf",
      contentLength: 2048,
      bucket: "private",
    });

    expect(getSignedUploadUrlMock).toHaveBeenCalledWith({
      key: "messages/prog_123/file.pdf",
      bucket: "private",
      contentType: "application/pdf",
      contentLength: 2048,
    });
  });

  it("rejects content types not allowed by the policy", async () => {
    await expect(
      createSignedUploadUrl({
        key,
        policy: "programLogos",
        contentType: "image/svg+xml",
        contentLength: 1024,
      }),
    ).rejects.toMatchObject({
      code: "unprocessable_entity",
      message: expect.stringContaining("Invalid content type"),
    } satisfies Partial<DubApiError>);

    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects an empty content type", async () => {
    await expect(
      createSignedUploadUrl({
        key,
        policy: "programLogos",
        contentType: "",
        contentLength: 1024,
      }),
    ).rejects.toBeInstanceOf(DubApiError);

    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects non-positive and non-integer content lengths", async () => {
    for (const contentLength of [0, -1, 1.5, Number.NaN]) {
      await expect(
        createSignedUploadUrl({
          key,
          policy: "programLogos",
          contentType: "image/png",
          contentLength,
        }),
      ).rejects.toMatchObject({
        code: "unprocessable_entity",
        message: "contentLength must be a positive integer.",
      });
    }

    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects files larger than the policy max", async () => {
    const maxBytes = UPLOAD_POLICIES.programLogos.maxBytes;

    await expect(
      createSignedUploadUrl({
        key,
        policy: "programLogos",
        contentType: "image/png",
        contentLength: maxBytes + 1,
      }),
    ).rejects.toMatchObject({
      code: "unprocessable_entity",
      message: "File size exceeds the maximum allowed size of 5MB",
    });

    expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("allows uploads at the exact policy size limit", async () => {
    const maxBytes = UPLOAD_POLICIES.programLogos.maxBytes;

    await expect(
      createSignedUploadUrl({
        key,
        policy: "programLogos",
        contentType: "image/avif",
        contentLength: maxBytes,
      }),
    ).resolves.toMatchObject({ signedUrl, key });

    expect(getSignedUploadUrlMock).toHaveBeenCalledOnce();
  });
});
