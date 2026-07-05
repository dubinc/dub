import { describe, expect, it } from "vitest";
import { getRelativeUrl } from "../../app/api/links/metatags/utils";

const PAGE = "https://example.com/blog/post";

describe("getRelativeUrl (metatags image resolution)", () => {
  it("keeps publicly-hosted absolute image URLs", () => {
    expect(getRelativeUrl(PAGE, "https://cdn.example.com/og.jpg")).toBe(
      "https://cdn.example.com/og.jpg",
    );
    expect(getRelativeUrl(PAGE, "http://images.example.com/og.png")).toBe(
      "http://images.example.com/og.png",
    );
  });

  it("resolves relative image URLs against the page origin", () => {
    expect(getRelativeUrl(PAGE, "/og.jpg")).toBe("https://example.com/og.jpg");
  });

  it("keeps inline base64 images", () => {
    const dataUrl =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(getRelativeUrl(PAGE, dataUrl)).toBe(dataUrl);
  });

  // Regression: preview sites with a misconfigured Next.js metadataBase ship
  // og:image as http://localhost:3000/...; the scraper must drop these since
  // they can't be proxied and previously broke link creation.
  it("drops images on localhost / loopback / private hosts", () => {
    expect(
      getRelativeUrl(PAGE, "http://localhost:3000/images/og.jpg"),
    ).toBeNull();
    expect(getRelativeUrl(PAGE, "http://127.0.0.1:3000/og.jpg")).toBeNull();
    expect(getRelativeUrl(PAGE, "http://foo/og.jpg")).toBeNull();
  });

  it("returns null for empty or non-http(s) image values", () => {
    expect(getRelativeUrl(PAGE, "")).toBeNull();
    expect(getRelativeUrl(PAGE, "ftp://files.example.com/og.jpg")).toBeNull();
  });
});
