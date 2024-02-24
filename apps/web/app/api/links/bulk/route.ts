import { exceededLimitError } from "@/lib/api/errors";
import { bulkCreateLinks, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/errors";
import { LinkWithTagIdsProps } from "@/lib/types";
import { bulkCreateLinksBodySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// POST /api/links/bulk – bulk create up to 100 links
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
    try {
      if (!project) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Missing project. Bulk link creation is only available for custom domain projects.",
        });
      }
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
          processLink({
            payload: link as LinkWithTagIdsProps,
            project,
            userId: session.user.id,
            bulk: true,
          }),
        ),
      );

      const validLinks = processedLinks
        .filter(({ error }) => !error)
        .map(({ link }) => link);

      const errors = processedLinks
        .filter(({ error }) => error)
        .map(({ link, error, code }) => ({
          link,
          error,
          code,
        }));

      const validLinksResponse =
        validLinks.length > 0
          ? await bulkCreateLinks({ links: validLinks })
          : [];

      return NextResponse.json([...validLinksResponse, ...errors], { headers });
    } catch (error) {
      return handleAndReturnErrorResponse(error);
    }
  },
  {
    needNotExceededLinks: true,
    requiredPlan: ["pro", "business", "enterprise"],
  },
);
