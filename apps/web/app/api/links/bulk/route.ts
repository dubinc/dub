import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/links/bulk – bulk create up to 100 links
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    if (!project) {
      return new Response(
        "Missing project. Bulk link creation is only available for custom domain projects.",
        { status: 400, headers },
      );
    }
    let links = [];
    try {
      links = await req.json();
      if (!Array.isArray(links)) {
        throw new Error("Invalid request body.");
      }
    } catch (e) {
      return new Response("Invalid request body.", { status: 400, headers });
    }
    if (links.length === 0) {
      return new Response("No links created.", { status: 304, headers });
    }
    if (links.length > 100) {
      return new Response("You can only create up to 100 links at a time.", {
        status: 400,
        headers,
      });
    }

    const processedLinks = await Promise.all(
      links.map(async (link) =>
        processLink({ payload: link, project, session, bulk: true }),
      ),
    );

    const validLinks = processedLinks
      .filter(({ error }) => !error)
      .map(({ link }) => link);

    const errors = processedLinks
      .filter(({ error }) => error)
      .map(({ link, error }) => ({
        link,
        error,
      }));

    const validLinksResponse =
      validLinks.length > 0 ? await bulkCreateLinks(validLinks) : [];

    return NextResponse.json([...validLinksResponse, ...errors], { headers });
  },
  {
    requiredPlan: ["pro", "enterprise"],
  },
);
