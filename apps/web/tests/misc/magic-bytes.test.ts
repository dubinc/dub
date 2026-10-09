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

  it("detects OLE compound storage", () => {
    expect(
      detectMimeFromMagicBytes(
        bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00),
      ),
    ).toBe("application/x-ole-storage");
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

  it("does not treat zip magic as legacy msword", () => {
    expect(
      mimeMatchesContentType({
        detectedMime: "application/zip",
        contentType: "application/msword",
      }),
    ).toBe(false);
  });

  it("allows OLE magic for msword and xls", () => {
    expect(
      mimeMatchesContentType({
        detectedMime: "application/x-ole-storage",
        contentType: "application/msword",
      }),
    ).toBe(true);
    expect(
      mimeMatchesContentType({
        detectedMime: "application/x-ole-storage",
        contentType: "application/vnd.ms-excel",
      }),
    ).toBe(true);
  });

  it("allows text types with no detected magic", () => {
    expect(
      mimeMatchesContentType({
        detectedMime: null,
        contentType: "text/plain",
      }),
    ).toBe(true);
    expect(
      mimeMatchesContentType({
        detectedMime: null,
        contentType: "text/csv",
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

  it("allows text/plain and text/csv under programs/", () => {
    const plain = decideQuarantine({
      key: "programs/prog_x/files/notes-abcd.txt",
      contentType: "text/plain",
      bytes: new TextEncoder().encode("hello partner resources"),
    });
    expect(plain).toMatchObject({
      action: "allow",
      reason: "magic_bytes_match",
    });

    const csv = decideQuarantine({
      key: "programs/prog_x/files/export-abcd.csv",
      contentType: "text/csv",
      bytes: new TextEncoder().encode("name,email\nAda,ada@example.com\n"),
    });
    expect(csv).toMatchObject({
      action: "allow",
      reason: "magic_bytes_match",
    });
  });

  it("quarantines HTML declared as text/plain", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html>xss</html>");
    const decision = decideQuarantine({
      key: "programs/prog_x/files/notes-abcd.txt",
      contentType: "text/plain",
      bytes: html,
    });
    expect(decision.action).toBe("quarantine");
    if (decision.action === "quarantine") {
      expect(decision.detectedMime).toBe("text/html");
      expect(decision.reason).toBe("magic_bytes_mismatch");
    }
  });

  it("allows legacy doc/xls OLE under programs/", () => {
    const ole = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00);
    expect(
      decideQuarantine({
        key: "programs/prog_x/files/brief-abcd.doc",
        contentType: "application/msword",
        bytes: ole,
      }),
    ).toMatchObject({
      action: "allow",
      reason: "magic_bytes_match",
    });
    expect(
      decideQuarantine({
        key: "programs/prog_x/files/sheet-abcd.xls",
        contentType: "application/vnd.ms-excel",
        bytes: ole,
      }),
    ).toMatchObject({
      action: "allow",
      reason: "magic_bytes_match",
    });
  });

  it("allows safe magic when Content-Type is missing or octet-stream", () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    expect(
      decideQuarantine({
        key: "programs/prog_x/emails/image_abc",
        contentType: null,
        bytes: png,
      }),
    ).toMatchObject({
      action: "allow",
      reason: "safe_magic_missing_content_type",
    });
    expect(
      decideQuarantine({
        key: "programs/prog_x/emails/image_abc",
        contentType: "application/octet-stream",
        bytes: png,
      }),
    ).toMatchObject({
      action: "allow",
      reason: "safe_magic_missing_content_type",
    });
  });

  it("quarantines zip/svg when Content-Type is missing", () => {
    const zip = decideQuarantine({
      key: "programs/prog_x/files/archive-abcd.zip",
      contentType: null,
      bytes: bytes(0x50, 0x4b, 0x03, 0x04),
    });
    expect(zip.action).toBe("quarantine");

    const svg = decideQuarantine({
      key: "programs/prog_x/logos/mark-abcd.svg",
      contentType: null,
      bytes: new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>'),
    });
    expect(svg.action).toBe("quarantine");
  });
});
