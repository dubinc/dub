import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { exceededLimitError } from "@/lib/api/errors";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import { bulkCreateLinksBodySchema } from "@/lib/zod/schemas/links";

// POST /api/links/bulk – bulk create up to 100 links
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    try {
      // TODO: Not sure this check is necessary, the project should always present
      // if (!project) {
      //   return new Response(
      //     "Missing project. Bulk link creation is only available for custom domain projects.",
      //     { status: 400, headers },
      //   );
      // }

      const links = bulkCreateLinksBodySchema.parse(await req.json());

      if (
        project.linksUsage + links.length > project.linksLimit &&
        (project.plan === "free" || project.plan === "pro")
      ) {
        throw new DubApiError({
          code: "exceeded_limit",
          message: exceededLimitError({
            plan: project.plan,
            limit: project.linksLimit,
            type: "links",
          }),
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
    } catch (err) {
      return handleAndReturnErrorResponse(err, headers);
    }
  },
  {
    needNotExceededLinks: true,
    requiredPlan: ["pro", "business", "enterprise"],
  },
);
