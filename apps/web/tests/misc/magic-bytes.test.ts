import {
  decideQuarantine,
  detectMimeFromMagicBytes,
  isUserUploadKey,
  mimeMatchesContentType,
} from "@/lib/storage/magic-bytes";
import { describe, expect, it } from "vitest";

function bytes(...values: number[]) {
  return new Uint8Array(values);
}

describe("detectMimeFromMagicBytes", () => {
  it("detects JPEG", () => {
    expect(detectMimeFromMagicBytes(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe(
      "image/jpeg",
    );
  });

  it("detects PNG", () => {
    expect(
      detectMimeFromMagicBytes(
        bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      ),
    ).toBe("image/png");
  });

  it("detects PDF", () => {
    expect(
      detectMimeFromMagicBytes(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31)),
    ).toBe("application/pdf");
  });

  it("detects HTML", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html>");
    expect(detectMimeFromMagicBytes(html)).toBe("text/html");
  });
});

describe("mimeMatchesContentType", () => {
  it("matches jpeg aliases", () => {
    expect(
      mimeMatchesContentType({
        detectedMime: "image/jpeg",
        contentType: "image/jpg",
      }),
    ).toBe(true);
  });

  it("allows zip magic for docx", () => {
    expect(
      mimeMatchesContentType({
        detectedMime: "application/zip",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBe(true);
  });

  it("rejects png declared as html body", () => {
    expect(
      mimeMatchesContentType({
        detectedMime: "text/html",
        contentType: "image/png",
      }),
    ).toBe(false);
  });
});

describe("decideQuarantine", () => {
  it("skips non user-upload prefixes", () => {
    const decision = decideQuarantine({
      key: "customers/avatar.png",
      contentType: "image/png",
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    });
    expect(decision.action).toBe("skip");
  });

  it("allows matching PNG on programs/", () => {
    expect(isUserUploadKey("programs/prog_x/emails/image_abc")).toBe(true);
    const decision = decideQuarantine({
      key: "programs/prog_x/emails/image_abc",
      contentType: "image/png",
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    });
    expect(decision).toMatchObject({
      action: "allow",
      reason: "magic_bytes_match",
    });
  });

  it("quarantines HTML uploaded as image/png", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html>xss</html>");
    const decision = decideQuarantine({
      key: "integration-screenshots/abc",
      contentType: "image/png",
      bytes: html,
    });
    expect(decision.action).toBe("quarantine");
    if (decision.action === "quarantine") {
      expect(decision.detectedMime).toBe("text/html");
      expect(decision.reason).toBe("magic_bytes_mismatch");
    }
  });

  it("quarantines dangerous content types", () => {
    const decision = decideQuarantine({
      key: "program-logos/logo",
      contentType: "text/html",
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    });
    expect(decision.action).toBe("quarantine");
    if (decision.action === "quarantine") {
      expect(decision.reason).toBe("dangerous_content_type");
    }
  });
});
