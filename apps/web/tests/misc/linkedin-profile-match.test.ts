import {
  linkedinPhotoFingerprint,
  linkedInProfilesMatch,
  normalizeLinkedInName,
} from "@/lib/partners/linkedin-profile-match";
import { describe, expect, it } from "vitest";

const OIDC_PICTURE =
  "https://media.licdn-ei.com/dms/image/C5F03AQHqK8v7tB1HCQ/profile-displayphoto-shrink_100_100/0/";
const SC_IMAGE =
  "https://media.licdn.com/dms/image/v2/C4E03AQH3Vz1qV_rNVQ/profile-displayphoto-shrink_200_200/profile-displayphoto-shrink_200_200/0/1633389534107?e=2147483647&v=beta&t=abc";
const OIDC_SAME_PHOTO_AS_SC =
  "https://media.licdn-ei.com/dms/image/C4E03AQH3Vz1qV_rNVQ/profile-displayphoto-shrink_100_100/0/";

describe("linkedinPhotoFingerprint", () => {
  it("extracts the asset id from an OIDC picture URL", () => {
    expect(linkedinPhotoFingerprint(OIDC_PICTURE)).toBe("C5F03AQHqK8v7tB1HCQ");
  });

  it("extracts the asset id from a ScrapeCreators v2 image URL", () => {
    expect(linkedinPhotoFingerprint(SC_IMAGE)).toBe("C4E03AQH3Vz1qV_rNVQ");
  });

  it("matches the same photo across OIDC and ScrapeCreators URL shapes", () => {
    expect(linkedinPhotoFingerprint(OIDC_SAME_PHOTO_AS_SC)).toBe(
      linkedinPhotoFingerprint(SC_IMAGE),
    );
  });

  it("returns null for default static avatars", () => {
    expect(
      linkedinPhotoFingerprint(
        "https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2",
      ),
    ).toBeNull();
  });
});

describe("normalizeLinkedInName", () => {
  it("trims, collapses whitespace, and casefolds", () => {
    expect(normalizeLinkedInName("  Sam   Parr ")).toBe("sam parr");
  });
});

describe("linkedInProfilesMatch", () => {
  it("requires both name and photo fingerprint to match", () => {
    expect(
      linkedInProfilesMatch({
        oauthName: "Sam Parr",
        oauthPicture: OIDC_SAME_PHOTO_AS_SC,
        scrapedName: "Sam Parr",
        scrapedImage: SC_IMAGE,
      }),
    ).toBe(true);
  });

  it("rejects matching names with different photos", () => {
    expect(
      linkedInProfilesMatch({
        oauthName: "Sam Parr",
        oauthPicture: OIDC_PICTURE,
        scrapedName: "Sam Parr",
        scrapedImage: SC_IMAGE,
      }),
    ).toBe(false);
  });

  it("rejects name-only matches without a real photo fingerprint", () => {
    expect(
      linkedInProfilesMatch({
        oauthName: "John Smith",
        oauthPicture:
          "https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2",
        scrapedName: "John Smith",
        scrapedImage:
          "https://static.licdn.com/aero-v1/sc/h/9c8pery4andzj6ohjkjp54ma2",
      }),
    ).toBe(false);
  });
});
