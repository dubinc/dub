import { DubApiError } from "@/lib/api/errors";
import { storage } from "@/lib/storage";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { UPLOAD_POLICIES } from "@/lib/storage/upload-policies";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
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

  it("returns a signed URL and destination URL", async () => {
    const result = await createSignedUploadUrl({
      key,
      contentType: "image/png",
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
      contentType: "image/png",
      contentLength: 1024,
    });
  });

  it("forwards the private bucket to the signer", async () => {
    await createSignedUploadUrl({
      key: "messages/prog_123/file.pdf",
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

  it.each([
    "integrationScreenshots",
    "programLogos",
    "programApplicationImages",
    "programCampaignImages",
    "programLanderImages",
    "programResourceLogos",
    "programResourceFiles",
    "bountySubmissionImages",
    "resumes",
  ] as const satisfies ReadonlyArray<keyof typeof UPLOAD_POLICIES>)(
    "pins Content-Type and Content-Length into the signer for %s",
    async (policy) => {
      const contentType = UPLOAD_POLICIES[policy].contentTypes[0];
      const contentLength = 2048;

      await createSignedUploadUrl({
        key: `public/${policy}/ok`,
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

describe("validateSignedUpload", () => {
  it("accepts an allowed upload", () => {
    expect(
      validateSignedUpload({
        policy: "programLanderImages",
        contentType: "image/png",
        contentLength: 1024,
      }),
    ).toEqual(UPLOAD_POLICIES.programLanderImages);
  });

  it("rejects image/svg+xml for bounty submission images", () => {
    expect(() =>
      validateSignedUpload({
        policy: "bountySubmissionImages",
        contentType: "image/svg+xml",
        contentLength: 1024,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unprocessable_entity",
        message: expect.stringContaining("Invalid content type"),
      } satisfies Partial<DubApiError>),
    );
  });

  it("rejects content types not allowed by the policy", () => {
    expect(() =>
      validateSignedUpload({
        policy: "programLogos",
        contentType: "image/svg+xml",
        contentLength: 1024,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unprocessable_entity",
        message: expect.stringContaining("Invalid content type"),
      } satisfies Partial<DubApiError>),
    );
  });

  it("rejects an empty content type", () => {
    expect(() =>
      validateSignedUpload({
        policy: "programLogos",
        contentType: "",
        contentLength: 1024,
      }),
    ).toThrow(DubApiError);
  });

  it("rejects non-positive and non-integer content lengths", () => {
    for (const contentLength of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        validateSignedUpload({
          policy: "programLogos",
          contentType: "image/png",
          contentLength,
        }),
      ).toThrow(
        expect.objectContaining({
          code: "unprocessable_entity",
          message: "contentLength must be a positive integer.",
        }),
      );
    }
  });

  it("rejects files larger than the policy max", () => {
    const maxBytes = UPLOAD_POLICIES.programLogos.maxBytes;

    expect(() =>
      validateSignedUpload({
        policy: "programLogos",
        contentType: "image/png",
        contentLength: maxBytes + 1,
      }),
    ).toThrow(
      expect.objectContaining({
        code: "unprocessable_entity",
        message: "File size exceeds the maximum allowed size of 5MB",
      }),
    );
  });

  it("allows uploads at the exact policy size limit", () => {
    const maxBytes = UPLOAD_POLICIES.programLogos.maxBytes;

    expect(
      validateSignedUpload({
        policy: "programLogos",
        contentType: "image/avif",
        contentLength: maxBytes,
      }),
    ).toEqual(UPLOAD_POLICIES.programLogos);
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
      "resumes",
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
      "rejects text/html for public policy %s",
      (policy) => {
        expect(() =>
          validateSignedUpload({
            policy,
            contentType: "text/html",
            contentLength: 128,
          }),
        ).toThrow(
          expect.objectContaining({
            code: "unprocessable_entity",
            message: expect.stringContaining("Invalid content type"),
          } satisfies Partial<DubApiError>),
        );
      },
    );

    it("rejects text/html for private message attachment policies", () => {
      for (const policy of [
        "programMessageAttachments",
        "partnerMessageAttachments",
      ] as const) {
        expect(() =>
          validateSignedUpload({
            policy,
            contentType: "text/html",
            contentLength: 128,
          }),
        ).toThrow(
          expect.objectContaining({
            code: "unprocessable_entity",
            message: expect.stringContaining("Invalid content type"),
          } satisfies Partial<DubApiError>),
        );
      }
    });

    it("rejects HTML/scriptable types that are outside each public policy allowlist", () => {
      for (const policy of publicPolicies) {
        const allowed = new Set<string>(UPLOAD_POLICIES[policy].contentTypes);

        for (const contentType of xssContentTypes) {
          if (allowed.has(contentType)) {
            continue;
          }

          expect(() =>
            validateSignedUpload({
              policy,
              contentType,
              contentLength: 128,
            }),
          ).toThrow(
            expect.objectContaining({
              code: "unprocessable_entity",
            } satisfies Partial<DubApiError>),
          );
        }
      }
    });
  });
});
