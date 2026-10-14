import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/api/safe-fetch", () => ({ safeFetch: vi.fn() }));

import { safeFetch } from "@/lib/api/safe-fetch";
import { getHtml, MAX_HTML_BYTES } from "../../app/api/links/metatags/utils";

const URL = "https://example.com/";
const CHUNK_BYTES = 64 * 1024;

// Streams `totalBytes` of HTML in chunks and counts how many bytes were pulled.
const htmlStream = (totalBytes: number) => {
  const stats = { bytesPulled: 0, cancelled: false };
  const chunk = new TextEncoder().encode("a".repeat(CHUNK_BYTES));

  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const remaining = totalBytes - stats.bytesPulled;
      if (remaining <= 0) {
        controller.close();
        return;
      }
      const next = remaining >= CHUNK_BYTES ? chunk : chunk.slice(0, remaining);
      stats.bytesPulled += next.byteLength;
      controller.enqueue(next);
    },
    cancel() {
      stats.cancelled = true;
    },
  });

  return { stream, stats };
};

describe("getHtml response size cap", () => {
  beforeEach(() => {
    vi.mocked(safeFetch).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns the HTML of a normal page", async () => {
    const html = "<html><head><title>Dub</title></head></html>";
    vi.mocked(safeFetch).mockResolvedValue(new Response(html));

    await expect(getHtml(URL)).resolves.toBe(html);
  });

  it("returns a body of exactly the cap", async () => {
    const { stream } = htmlStream(MAX_HTML_BYTES);
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    const html = await getHtml(URL);
    expect(html).toHaveLength(MAX_HTML_BYTES);
  });

  it("returns null before reading the body when Content-Length is too large", async () => {
    const { stream, stats } = htmlStream(MAX_HTML_BYTES * 2);
    vi.mocked(safeFetch).mockResolvedValue(
      new Response(stream, {
        headers: { "content-length": String(MAX_HTML_BYTES + 1) },
      }),
    );

    await expect(getHtml(URL)).resolves.toBeNull();
    expect(stats.cancelled).toBe(true);
    // The stream can pull one chunk ahead before the body is cancelled.
    expect(stats.bytesPulled).toBeLessThanOrEqual(CHUNK_BYTES);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("Content-Length"),
    );
  });

  it("stops reading and returns null when a body without Content-Length passes the cap", async () => {
    const { stream, stats } = htmlStream(MAX_HTML_BYTES * 4);
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    await expect(getHtml(URL)).resolves.toBeNull();
    expect(stats.cancelled).toBe(true);
    // The body is 4x the cap. Reading stops one chunk past the cap, and the
    // stream can pull one more chunk ahead before it is cancelled.
    expect(stats.bytesPulled).toBeLessThanOrEqual(
      MAX_HTML_BYTES + 2 * CHUNK_BYTES,
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`passed ${MAX_HTML_BYTES} bytes`),
    );
  });

  it("decodes multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("<title>café 🔗</title>");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Split inside the 4-byte emoji.
        controller.enqueue(bytes.slice(0, bytes.length - 10));
        controller.enqueue(bytes.slice(bytes.length - 10));
        controller.close();
      },
    });
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    await expect(getHtml(URL)).resolves.toBe("<title>café 🔗</title>");
  });
});
