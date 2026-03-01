import { seedArticle } from "@/lib/ai/seed-article";

// POST /api/ai/sync-embeddings
// Triggers re-embedding of a single docs/help article.
// Called by the docs GitHub Action when a .mdx file changes.
//
// Auth: Authorization: Bearer <EMBEDDING_SYNC_SECRET>
// Body: { url: string }
export const POST = async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  const secret = process.env.EMBEDDING_SYNC_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let url: string;
  try {
    ({ url } = await req.json());
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!url || typeof url !== "string") {
    return new Response("Missing or invalid `url` field", { status: 400 });
  }

  // Only allow dub.co docs and help URLs
  if (
    !url.startsWith("https://dub.co/docs/") &&
    !url.startsWith("https://dub.co/help/")
  ) {
    return new Response("URL must be a dub.co/docs or dub.co/help URL", {
      status: 400,
    });
  }

  try {
    const result = await seedArticle(url);
    return Response.json({ success: true, url, ...result });
  } catch (err) {
    console.error(`Failed to seed ${url}:`, err);
    return Response.json(
      { success: false, url, error: String(err) },
      { status: 500 },
    );
  }
};
