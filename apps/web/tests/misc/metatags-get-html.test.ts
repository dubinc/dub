import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/api/safe-fetch", () => ({ safeFetch: vi.fn() }));

import { safeFetch } from "@/lib/api/safe-fetch";
import { getHtml, MAX_HTML_BYTES } from "../../app/api/links/metatags/utils";

const URL = "https://example.com/";
const CHUNK_BYTES = 64 * 1024;

// Streams `totalBytes` of HTML in chunks and counts how many bytes were pulled.
// With highWaterMark 0, the stream pulls nothing until the body is read.
const htmlStream = (totalBytes: number, highWaterMark = 1) => {
  const stats = { bytesPulled: 0, cancelled: false };
  const chunk = new TextEncoder().encode("a".repeat(CHUNK_BYTES));

  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        const remaining = totalBytes - stats.bytesPulled;
        if (remaining <= 0) {
          controller.close();
          return;
        }
        const next =
          remaining >= CHUNK_BYTES ? chunk : chunk.slice(0, remaining);
        stats.bytesPulled += next.byteLength;
        controller.enqueue(next);
      },
      cancel() {
        stats.cancelled = true;
      },
    },
    { highWaterMark },
  );

  return { stream, stats };
};

describe("getHtml response size limit", () => {
  beforeEach(() => {
    vi.mocked(safeFetch).mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("returns the HTML of a normal page up to the end of the head", async () => {
    const html = "<html><head><title>Dub</title></head><body>Hi</body></html>";
    vi.mocked(safeFetch).mockResolvedValue(new Response(html));

    await expect(getHtml(URL)).resolves.toBe(
      "<html><head><title>Dub</title></head>",
    );
  });

  it("returns a body of exactly the cap", async () => {
    const { stream } = htmlStream(MAX_HTML_BYTES);
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    const html = await getHtml(URL);
    expect(html).toHaveLength(MAX_HTML_BYTES);
  });

  it("returns only the first MAX_HTML_BYTES of a larger body and stops reading", async () => {
    const { stream, stats } = htmlStream(MAX_HTML_BYTES * 4);
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    const html = await getHtml(URL);
    expect(html).toHaveLength(MAX_HTML_BYTES);
    expect(stats.cancelled).toBe(true);
    // The stream can pull one chunk ahead before it is cancelled.
    expect(stats.bytesPulled).toBeLessThanOrEqual(MAX_HTML_BYTES + CHUNK_BYTES);
  });

  it("does not trust a Content-Length header that is too large", async () => {
    const html = "<html><head><title>Dub</title></head>";
    vi.mocked(safeFetch).mockResolvedValue(
      new Response(html, {
        headers: { "content-length": String(MAX_HTML_BYTES * 10) },
      }),
    );

    await expect(getHtml(URL)).resolves.toBe(html);
  });

  it("stops reading at the end of the head", async () => {
    const head = new TextEncoder().encode(
      "<html><head><title>Dub</title></head><body>",
    );
    const { stream: body, stats } = htmlStream(MAX_HTML_BYTES * 4, 0);
    const bodyReader = body.getReader();
    let headSent = false;
    const stream = new ReadableStream<Uint8Array>(
      {
        async pull(controller) {
          if (!headSent) {
            headSent = true;
            controller.enqueue(head);
            return;
          }
          const { done, value } = await bodyReader.read();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(value);
          }
        },
        cancel() {
          return bodyReader.cancel();
        },
      },
      { highWaterMark: 0 },
    );
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    await expect(getHtml(URL)).resolves.toBe(
      "<html><head><title>Dub</title></head>",
    );
    expect(stats.bytesPulled).toBe(0);
    expect(stats.cancelled).toBe(true);
  });

  it("finds an uppercase </HEAD> split across chunks", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode("<HTML><HEAD><TITLE>Dub</TITLE></HE"),
        );
        controller.enqueue(encoder.encode("AD><BODY>Hi</BODY></HTML>"));
        controller.close();
      },
    });
    vi.mocked(safeFetch).mockResolvedValue(new Response(stream));

    await expect(getHtml(URL)).resolves.toBe(
      "<HTML><HEAD><TITLE>Dub</TITLE></HEAD>",
    );
  });

  it("returns null for a Cloudflare challenge page", async () => {
    vi.mocked(safeFetch).mockResolvedValue(
      new Response("<html><head><title>Just a moment...</title></head>", {
        headers: { "cf-mitigated": "challenge" },
      }),
    );

    await expect(getHtml(URL)).resolves.toBeNull();
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
