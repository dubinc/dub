import { upsertDocsEmbeddings } from "@/lib/ai/upsert-docs-embedding";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";

const schema = z.object({
  url: z.url().refine(
    (val) => {
      try {
        const { protocol, hostname, pathname } = new URL(val);
        return (
          protocol === "https:" &&
          ["dub.co", "www.dub.co"].includes(hostname) &&
          ["/docs/", "/help/"].some((p) => pathname.startsWith(p))
        );
      } catch {
        return false;
      }
    },
    { message: "URL must be a dub.co/docs or dub.co/help URL" },
  ),
  delay: z.number().positive().optional(),
});

// POST /api/ai/sync-embeddings
// Triggers re-embedding of a single docs/help article.
// Called by the docs GitHub Action when a .mdx file changes.
//
// Auth: Authorization: Bearer <EMBEDDING_SYNC_SECRET>
// Body: { url: string; delay?: number }
export const POST = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.EMBEDDING_SYNC_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json().catch(() => {
      throw new DubApiError({ code: "bad_request", message: "Invalid JSON body." });
    });
    const { url, delay } = schema.parse(body);
    const normalizedUrl = new URL(url).toString();

    if (delay !== undefined) {
      const response = await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/ai/sync-embeddings`,
        method: "POST",
        delay,
        headers: { Authorization: `Bearer ${secret}` },
        body: { url: normalizedUrl },
      });

      return Response.json({
        scheduled: true,
        url: normalizedUrl,
        delay,
        messageId: response.messageId,
      });
    }

    // const pageviewsMap = await fetchPlausiblePageviews();
    const result = await upsertDocsEmbeddings(
      normalizedUrl,
      // pageviewsMap // TODO: add pageviewsMap back in once we support it
    );
    return Response.json({ success: true, url: normalizedUrl, ...result });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
};
