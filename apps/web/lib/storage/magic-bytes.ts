/**
 * Magic-byte helpers for user-upload validation.
 * Used by Next.js processR2ObjectCreated (Worker only forwards queue messages).
 */

export const USER_UPLOAD_KEY_PREFIXES = [
  "programs/",
  "integration-screenshots/",
  "program-logos/",
  "messages/",
  "resumes/",
] as const;

export const DANGEROUS_CONTENT_TYPES = [
  "text/html",
  "application/xhtml+xml",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/jscript",
] as const;

const ZIP_FAMILY_CONTENT_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

// Legacy .doc / .xls share OLE Compound File magic (not ZIP/OOXML)
const OLE_FAMILY_CONTENT_TYPES = [
  "application/msword",
  "application/vnd.ms-excel",
] as const;

const TEXT_CONTENT_TYPES = ["text/plain", "text/csv"] as const;

// Unambiguous magic when R2 omits Content-Type (exclude SVG/ZIP/OLE — need declared type)
const SAFE_MAGIC_ONLY_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "application/pdf",
] as const;

function isMissingOrGenericContentType(
  contentType: string | null | undefined,
): boolean {
  const normalized = normalizeContentType(contentType);
  return !normalized || normalized === "application/octet-stream";
}

export function isUserUploadKey(key: string): boolean {
  if (key.startsWith("quarantine/")) {
    return false;
  }

  return USER_UPLOAD_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

export function normalizeContentType(
  contentType: string | null | undefined,
): string | null {
  if (!contentType) {
    return null;
  }

  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? null;
  if (!base) {
    return null;
  }

  if (base === "image/jpg") {
    return "image/jpeg";
  }

  return base;
}

export function isDangerousContentType(
  contentType: string | null | undefined,
): boolean {
  const normalized = normalizeContentType(contentType);
  if (!normalized) {
    return false;
  }

  return (DANGEROUS_CONTENT_TYPES as readonly string[]).includes(normalized);
}

function startsWithBytes(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) {
    return false;
  }

  return signature.every((value, index) => bytes[index] === value);
}

function indexOfBytes(haystack: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        continue outer;
      }
    }
    return i;
  }
  return -1;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const text = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes)
    .trimStart()
    .toLowerCase();

  if (text.includes("<html") || text.includes("<!doctype html")) {
    return false;
  }

  return (
    text.includes("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))
  );
}

/**
 * Detect MIME from the start of a file. Returns null when unknown.
 */
export function detectMimeFromMagicBytes(bytes: Uint8Array): string | null {
  if (bytes.length === 0) {
    return null;
  }

  // JPEG
  if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  // PNG
  if (
    startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return "image/png";
  }

  // GIF
  if (
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
    startsWithBytes(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    startsWithBytes(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes.length >= 12 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // AVIF / HEIC family: ....ftyp
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(
      bytes[8],
      bytes[9],
      bytes[10],
      bytes[11],
    ).toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) {
      return "image/avif";
    }
  }

  // PDF
  if (startsWithBytes(bytes, [0x25, 0x50, 0x44, 0x46])) {
    return "application/pdf";
  }

  // OLE Compound File (legacy .doc / .xls)
  if (
    startsWithBytes(bytes, [
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
    ])
  ) {
    return "application/x-ole-storage";
  }

  // ZIP / OOXML
  if (startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return "application/zip";
  }

  // SVG (text)
  if (looksLikeSvg(bytes)) {
    return "image/svg+xml";
  }

  // HTML sniff (for explicit mismatch detection)
  const htmlMarkers = [
    [0x3c, 0x68, 0x74, 0x6d, 0x6c], // <html
    [0x3c, 0x48, 0x54, 0x4d, 0x4c], // <HTML
    [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50, 0x45], // <!DOCTYPE
  ];
  for (const marker of htmlMarkers) {
    if (
      indexOfBytes(bytes.slice(0, Math.min(bytes.length, 512)), marker) !== -1
    ) {
      return "text/html";
    }
  }

  return null;
}

export function mimeMatchesContentType({
  detectedMime,
  contentType,
}: {
  detectedMime: string | null;
  contentType: string | null | undefined;
}): boolean {
  const declared = normalizeContentType(contentType);
  if (!declared) {
    return false;
  }

  // TXT/CSV have no reliable magic; allow when declared and body is not sniffed
  // as something else (e.g. HTML would set detectedMime and fail below).
  if (
    (TEXT_CONTENT_TYPES as readonly string[]).includes(declared) &&
    !detectedMime
  ) {
    return true;
  }

  if (!detectedMime) {
    return false;
  }

  if (declared === detectedMime) {
    return true;
  }

  // OOXML / zip containers share PK magic
  if (
    detectedMime === "application/zip" &&
    (ZIP_FAMILY_CONTENT_TYPES as readonly string[]).includes(declared)
  ) {
    return true;
  }

  // Legacy Office binaries share OLE Compound File magic
  if (
    detectedMime === "application/x-ole-storage" &&
    (OLE_FAMILY_CONTENT_TYPES as readonly string[]).includes(declared)
  ) {
    return true;
  }

  return false;
}

export type QuarantineDecision =
  | { action: "skip"; reason: string }
  | { action: "allow"; reason: string }
  | {
      action: "quarantine";
      reason: string;
      detectedMime: string | null;
      contentType: string | null;
    };

export function decideQuarantine({
  key,
  contentType,
  bytes,
}: {
  key: string;
  contentType: string | null | undefined;
  bytes: Uint8Array;
}): QuarantineDecision {
  if (!isUserUploadKey(key)) {
    return {
      action: "skip",
      reason: "non_user_upload_prefix",
    };
  }

  const normalized = normalizeContentType(contentType);

  if (isDangerousContentType(normalized)) {
    return {
      action: "quarantine",
      reason: "dangerous_content_type",
      detectedMime: detectMimeFromMagicBytes(bytes),
      contentType: normalized,
    };
  }

  const detectedMime = detectMimeFromMagicBytes(bytes);

  if (
    mimeMatchesContentType({
      detectedMime,
      contentType: normalized,
    })
  ) {
    return {
      action: "allow",
      reason: "magic_bytes_match",
    };
  }

  // R2 sometimes omits Content-Type or stores octet-stream; trust unambiguous magic
  if (
    isMissingOrGenericContentType(normalized) &&
    detectedMime &&
    (SAFE_MAGIC_ONLY_CONTENT_TYPES as readonly string[]).includes(detectedMime)
  ) {
    return {
      action: "allow",
      reason: "safe_magic_missing_content_type",
    };
  }

  return {
    action: "quarantine",
    reason: detectedMime ? "magic_bytes_mismatch" : "unknown_magic_bytes",
    detectedMime,
    contentType: normalized,
  };
}
