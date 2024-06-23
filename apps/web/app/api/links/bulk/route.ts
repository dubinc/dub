import { DubApiError, exceededLimitError } from "@/lib/api/errors";
import { bulkCreateLinks, combineTagIds, processLink } from "@/lib/api/links";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProcessedLinkProps } from "@/lib/types";
import { bulkCreateLinksBodySchema } from "@/lib/zod/schemas/links";
import { NextResponse } from "next/server";

// POST /api/links/bulk – bulk create up to 100 links
export const POST = withWorkspace(
  async ({ req, headers, session, workspace }) => {
    if (!workspace) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Missing workspace. Bulk link creation is only available for custom domain workspaces.",
      });
    }

    throwIfLinksUsageExceeded(workspace);

    const links = bulkCreateLinksBodySchema.parse(await parseRequestBody(req));
    if (
      workspace.linksUsage + links.length > workspace.linksLimit &&
      (workspace.plan === "free" || workspace.plan === "pro")
    ) {
      throw new DubApiError({
        code: "exceeded_limit",
        message: exceededLimitError({
          plan: workspace.plan,
          limit: workspace.linksLimit,
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
          payload: link,
          workspace,
          userId: session.user.id,
          bulk: true,
        }),
      ),
    );

    let validLinks = processedLinks
      .filter(({ error }) => error == null)
      .map(({ link }) => link) as ProcessedLinkProps[];

    let errorLinks = processedLinks
      .filter(({ error }) => error != null)
      .map(({ link, error, code }) => ({
        link,
        error,
        code,
      }));

    // filter out tags that don't belong to the workspace
    const workspaceTags = await prisma.tag.findMany({
      where: {
        projectId: workspace.id,
      },
      select: {
        id: true,
        name: true,
      },
    });
    const workspaceTagIds = workspaceTags.map(({ id }) => id);
    const workspaceTagNames = workspaceTags.map(({ name }) => name);
    validLinks.forEach((link, index) => {
      const combinedTagIds =
        combineTagIds({
          tagId: link.tagId,
          tagIds: link.tagIds,
        }) ?? [];
      const invalidTagIds = combinedTagIds.filter(
        (id) => !workspaceTagIds.includes(id),
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

      const invalidTagNames = link.tagNames?.filter(
        (name) => !workspaceTagNames.includes(name),
      );
      if (invalidTagNames?.length) {
        validLinks = validLinks.filter((_, i) => i !== index);
        errorLinks.push({
          link,
          error: `Invalid tagNames detected: ${invalidTagNames.join(", ")}`,
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
);
