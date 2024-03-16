import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { bulkCreateLinks, combineTagIds, processLink } from "@/lib/api/links";
import { withAuth } from "@/lib/auth/utils";
import prisma from "@/lib/prisma";
import { LinkWithTagIdsProps } from "@/lib/types";
import { bulkCreateLinksBodySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// POST /api/links/bulk – bulk create up to 100 links
export const POST = withAuth(
  async ({ req, headers, session, project }) => {
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

    // check if any of the links have a defined key and the domain + key combination is the same
    const duplicates = links.filter(
      (link, index, self) =>
        link.key &&
        self
          .slice(index + 1)
          .some((l) => l.domain === link.domain && l.key === link.key),
    );
    if (duplicates.length > 0) {
      throw new DubApiError({
        code: "bad_request",
        message: `Duplicate links found: ${duplicates
          .map((link) => `${link.domain}/${link.key}`)
          .join(", ")}`,
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

    let validLinks = processedLinks
      .filter(({ error }) => !error)
      .map(({ link }) => link);

    let errorLinks = processedLinks
      .filter(({ error }) => error)
      .map(({ link, error, code }) => ({
        link,
        error,
        code,
      }));

    // filter out tags that don't belong to the project
    const projectTags = await prisma.tag.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
      },
    });
    const projectTagIds = projectTags.map(({ id }) => id);
    validLinks.forEach((link, index) => {
      const combinedTagIds = combineTagIds({
        tagId: link.tagId,
        tagIds: link.tagIds,
      });
      const invalidTagIds = combinedTagIds.filter(
        (id) => !projectTagIds.includes(id),
      );
      if (invalidTagIds.length > 0) {
        // remove link from validLinks and add error to errorLinks
        validLinks = validLinks.filter((_, i) => i !== index);
        errorLinks.push({
          link,
          error: `Invalid tagIds detected: ${invalidTagIds.join(", ")}`,
          code: "unprocessable_entity",
        });
      }
    });

    const validLinksResponse =
      validLinks.length > 0 ? await bulkCreateLinks({ links: validLinks }) : [];

    return NextResponse.json([...validLinksResponse, ...errorLinks], {
      headers,
    });
  },
  {
    needNotExceededLinks: true,
  },
);
