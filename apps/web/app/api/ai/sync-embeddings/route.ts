import { upsertDocsEmbeddings } from "@/lib/ai/upsert-docs-embedding";
import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// POST /api/ai/sync-embeddings
// Triggers re-embedding of a single docs/help article.
// Called by the docs GitHub Action when a .mdx file changes.
//
// Auth: Authorization: Bearer <EMBEDDING_SYNC_SECRET>
// Body: { url: string; sleep?: number }
export const POST = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.EMBEDDING_SYNC_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let url: string;
  let sleep: number | undefined;
  try {
    ({ url, sleep } = await req.json());
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return new Response("Missing or invalid `url` field", { status: 400 });
  }

  if (sleep !== undefined && (typeof sleep !== "number" || sleep <= 0)) {
    return new Response("`sleep` must be a positive number (seconds)", {
      status: 400,
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  const allowedHostnames = ["dub.co", "www.dub.co"];
  const allowedPathPrefixes = ["/docs/", "/help/"];
  if (
    parsedUrl.protocol !== "https:" ||
    !allowedHostnames.includes(parsedUrl.hostname) ||
    !allowedPathPrefixes.some((p) => parsedUrl.pathname.startsWith(p))
  ) {
    return new Response("URL must be a dub.co/docs or dub.co/help URL", {
      status: 400,
    });
  }

  const normalizedUrl = parsedUrl.toString();

  if (sleep !== undefined) {
    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/ai/sync-embeddings`,
      method: "POST",
      delay: sleep,
      headers: { Authorization: `Bearer ${secret}` },
      body: { url: normalizedUrl },
    });

    return Response.json({
      scheduled: true,
      url: normalizedUrl,
      delay: sleep,
      messageId: response.messageId,
    });
  }

  try {
    // const pageviewsMap = await fetchPlausiblePageviews();
    const result = await upsertDocsEmbeddings(
      normalizedUrl,
      // pageviewsMap // TODO: add pageviewsMap back in once we support it
    );
    return Response.json({ success: true, url: normalizedUrl, ...result });
  } catch (err) {
    console.error("Failed to seed URL:", normalizedUrl, err);
    return Response.json(
      { success: false, url: normalizedUrl, error: "Failed to seed embedding" },
      { status: 500 },
    );
  }
};
