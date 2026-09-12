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

  // Stored XSS on dubassets.com: unsigned Content-Type let clients PUT text/html.
  describe("Content-Type pinning (XSS regression)", () => {
    const publicPolicies = [
      "integrationScreenshots",
      "programLogos",
      "programApplicationImages",
      "programCampaignImages",
      "programLanderImages",
      "programResourceLogos",
      "programResourceFiles",
      "bountySubmissionImages",
    ] as const satisfies ReadonlyArray<keyof typeof UPLOAD_POLICIES>;

    const xssContentTypes = [
      "text/html",
      "text/html;charset=utf-8",
      "application/xhtml+xml",
      "image/svg+xml", // only some policies allow SVG; still XSS-capable when allowed
    ] as const;

    it("never allowlists text/html (or HTML charset variants) on any policy", () => {
      for (const [name, policy] of Object.entries(UPLOAD_POLICIES)) {
        expect(
          policy.contentTypes,
          `${name} must not allow text/html`,
        ).not.toContain("text/html");
        expect(
          policy.contentTypes.some((type) =>
            type.toLowerCase().startsWith("text/html"),
          ),
          `${name} must not allow text/html*`,
        ).toBe(false);
      }
    });

    it.each(publicPolicies)(
      "rejects text/html for public policy %s before signing",
      async (policy) => {
        await expect(
          createSignedUploadUrl({
            key: `public/${policy}/xss.html`,
            policy,
            contentType: "text/html",
            contentLength: 128,
          }),
        ).rejects.toMatchObject({
          code: "unprocessable_entity",
          message: expect.stringContaining("Invalid content type"),
        } satisfies Partial<DubApiError>);

        expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
      },
    );

    it("rejects text/html for private message attachment policies", async () => {
      for (const policy of [
        "programMessageAttachments",
        "partnerMessageAttachments",
      ] as const) {
        await expect(
          createSignedUploadUrl({
            key: `messages/${policy}/xss.html`,
            policy,
            contentType: "text/html",
            contentLength: 128,
            bucket: "private",
          }),
        ).rejects.toMatchObject({
          code: "unprocessable_entity",
          message: expect.stringContaining("Invalid content type"),
        } satisfies Partial<DubApiError>);
      }

      expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
    });

    it("rejects HTML/scriptable types that are outside each public policy allowlist", async () => {
      for (const policy of publicPolicies) {
        const allowed = new Set<string>(UPLOAD_POLICIES[policy].contentTypes);

        for (const contentType of xssContentTypes) {
          if (allowed.has(contentType)) {
            continue;
          }

          await expect(
            createSignedUploadUrl({
              key: `public/${policy}/blocked`,
              policy,
              contentType,
              contentLength: 128,
            }),
          ).rejects.toMatchObject({
            code: "unprocessable_entity",
          } satisfies Partial<DubApiError>);
        }
      }

      expect(getSignedUploadUrlMock).not.toHaveBeenCalled();
    });

    it.each(publicPolicies)(
      "pins Content-Type and Content-Length into the signer for %s",
      async (policy) => {
        const contentType = UPLOAD_POLICIES[policy].contentTypes[0];
        const contentLength = 2048;

        await createSignedUploadUrl({
          key: `public/${policy}/ok`,
          policy,
          contentType,
          contentLength,
        });

        expect(getSignedUploadUrlMock).toHaveBeenCalledWith({
          key: `public/${policy}/ok`,
          bucket: "public",
          contentType,
          contentLength,
        });
      },
    );
  });
});
