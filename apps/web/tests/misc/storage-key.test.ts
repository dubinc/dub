import { getOwnedLinkImageKey } from "@/lib/api/links/get-owned-link-image-key";
import { storage } from "@/lib/storage";
import {
  assertSafeStorageKey,
  isSafeStorageKey,
  urlPathHasRelativeSegments,
} from "@/lib/storage/assert-safe-storage-key";
import { publicHostedImageSchema } from "@/lib/zod/schemas/images";
import {
  createLinkBodySchema,
  createLinkBodySchemaAsync,
} from "@/lib/zod/schemas/links";
import { R2_URL } from "@dub/utils";
import { describe, expect, it } from "vitest";

const linkId = "link_1M4W0XN11M227PH3DNYRH6H3Q";

describe("isSafeStorageKey", () => {
  it.each([
    "images/link_1M4W0XN11M227PH3DNYRH6H3Q",
    "images/link_1M4W0XN11M227PH3DNYRH6H3Q_abc1234",
    "messages/prog_123/file.pdf",
    "messages/prog_123/100%25.pdf",
    "messages/prog_123/foo%2Fbar.pdf",
    "messages/prog_123/my file.png",
    "resumes/ZbOEyTdkAe",
  ])("accepts %s", (key) => {
    expect(isSafeStorageKey(key)).toBe(true);
  });

  it.each([
    "images/link_1/../../resumes/ZbOEyTdkAe",
    "images/%2e%2e/secret",
    "images/%2E%2E/%2e%2e/secret",
    "images/%252e%252e/secret",
    "images/..%2f..%2fsecret",
    "/images/link_1",
    "images//link_1",
    "images/./link_1",
    "images/link_1/",
    "images/foo\\..\\..\\secret",
    "../other-bucket/secret",
    "",
  ])("rejects %s", (key) => {
    expect(isSafeStorageKey(key)).toBe(false);
    expect(() => assertSafeStorageKey(key)).toThrow("Invalid storage key.");
  });
});

describe("getOwnedLinkImageKey", () => {
  it("returns the key for this link's uploaded image", () => {
    expect(getOwnedLinkImageKey(`${R2_URL}/images/${linkId}`, linkId)).toBe(
      `images/${linkId}`,
    );
    expect(
      getOwnedLinkImageKey(`${R2_URL}/images/${linkId}_abc1234`, linkId),
    ).toBe(`images/${linkId}_abc1234`);
  });

  it("rejects a relative path that still starts with the link prefix", () => {
    expect(
      getOwnedLinkImageKey(
        `${R2_URL}/images/${linkId}/../../resumes/ZbOEyTdkAe`,
        linkId,
      ),
    ).toBeNull();
  });

  it.each([
    `${R2_URL}/images/${linkId}/%2e%2e/%2e%2e/resumes/ZbOEyTdkAe`,
    `${R2_URL}/images/${linkId}\\..\\..\\resumes\\ZbOEyTdkAe`,
    `${R2_URL}/resumes/ZbOEyTdkAe`,
    `${R2_URL}/images/link_someoneelse`,
    "https://example.com/og.png",
    `${R2_URL}/images/${linkId}/extra`,
  ])("rejects %s", (image) => {
    expect(getOwnedLinkImageKey(image, linkId)).toBeNull();
  });
});

describe("link image schema", () => {
  const traversal = `${R2_URL}/images/${linkId}/../../resumes/ZbOEyTdkAe`;

  it("rejects relative segments in hosted image URLs", () => {
    expect(urlPathHasRelativeSegments(traversal)).toBe(true);
    expect(urlPathHasRelativeSegments("https://example.com/og.png")).toBe(
      false,
    );
    expect(publicHostedImageSchema.safeParse(traversal).success).toBe(false);
    expect(
      publicHostedImageSchema.safeParse("https://example.com/og.png").success,
    ).toBe(true);
  });

  it("rejects the traversal image on create and update schemas", async () => {
    expect(
      createLinkBodySchema.safeParse({
        url: "https://example.com",
        image: traversal,
      }).success,
    ).toBe(false);

    await expect(
      createLinkBodySchemaAsync.parseAsync({
        url: "https://example.com",
        image: traversal,
      }),
    ).rejects.toThrow(/relative path segments/);
  });
});

describe("storage client", () => {
  it("refuses to delete a key the signer would resolve elsewhere", async () => {
    await expect(
      storage.delete({ key: "images/link_1/../../resumes/ZbOEyTdkAe" }),
    ).rejects.toThrow("Invalid storage key.");
  });
});
