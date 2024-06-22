import {
  addDomainToVercel,
  deleteDomainAndLinks,
  removeDomainFromVercel,
  validateDomain,
} from "@/lib/api/domains";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import {
  DomainSchema,
  updateDomainBodySchema,
} from "@/lib/zod/schemas/domains";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/domains/[domain] – get a workspace's domain
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { domain } = params;

    const domainRecord = await prisma.domain.findUnique({
      where: {
        slug: domain,
        projectId: workspace.id,
      },
    });

    if (!domainRecord) {
      throw new DubApiError({
        code: "not_found",
        message: "Domain not found",
      });
    }

    return NextResponse.json(DomainSchema.parse(domainRecord));
  },
  {
    domainChecks: true,
  },
);

// PUT /api/domains/[domain] – edit a workspace's domain
export const PATCH = withWorkspace(
  async ({ req, workspace, params }) => {
    const { domain } = params;

    const payload = updateDomainBodySchema.parse(await parseRequestBody(req));

    const { slug: newDomain, placeholder, expiredUrl, archived } = payload;

    if (workspace.plan === "free" && expiredUrl) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You can only use Default Expiration URLs on a Pro plan and above. Upgrade to Pro to use these features.",
      });
    }

    const domainUpdated =
      newDomain && newDomain.toLowerCase() !== domain.toLowerCase();

    if (domainUpdated) {
      const validDomain = await validateDomain(newDomain);
      if (validDomain.error && validDomain.code) {
        throw new DubApiError({
          code: validDomain.code,
          message: validDomain.error,
        });
      }
      const vercelResponse = await addDomainToVercel(newDomain);
      if (vercelResponse.error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: vercelResponse.error.message,
        });
      }
    }

    const domainRecord = await prisma.domain.update({
      where: {
        slug: domain,
      },
      data: {
        archived,
        ...(domainUpdated && { slug: newDomain }),
        ...(placeholder && { placeholder }),
        ...(workspace.plan != "free" && {
          expiredUrl,
        }),
      },
    });

    waitUntil(
      (async () => {
        if (domainUpdated) {
          await Promise.all([
            // remove old domain from Vercel
            removeDomainFromVercel(domain),
            // rename redis key
            redis.rename(domain.toLowerCase(), newDomain.toLowerCase()),
          ]);

          const allLinks = await prisma.link.findMany({
            where: {
              domain: newDomain,
            },
            include: {
              tags: true,
            },
          });

          // update all links in Tinybird
          recordLink(
            allLinks.map((link) => ({
              link_id: link.id,
              domain: link.domain,
              key: link.key,
              url: link.url,
              tag_ids: link.tags.map((tag) => tag.tagId),
              workspace_id: link.projectId,
              created_at: link.createdAt,
            })),
          );
        }
      })(),
    );

    return NextResponse.json(DomainSchema.parse(domainRecord));
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);

// DELETE /api/domains/[domain] - delete a workspace's domain
export const DELETE = withWorkspace(
  async ({ params }) => {
    const { domain } = params;

    await deleteDomainAndLinks(domain);

    return NextResponse.json({ slug: domain });
  },
  {
    domainChecks: true,
    requiredRole: ["owner"],
  },
);
