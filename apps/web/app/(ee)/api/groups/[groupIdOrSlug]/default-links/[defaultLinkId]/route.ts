import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { queueDomainUpdate } from "@/lib/api/domains/queue-domain-update";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  createOrUpdateDefaultLinkSchema,
  PartnerGroupDefaultLinkSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, constructURLFromUTMParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/groups/[groupIdOrSlug]/default-links/[defaultLinkId] - update a default link for a group
export const PATCH = withWorkspace(
  async ({ workspace, req, params }) => {
    const { groupIdOrSlug } = params;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { domain, url } = createOrUpdateDefaultLinkSchema.parse(
      await parseRequestBody(req),
    );

    const [group, domainRecord] = await Promise.all([
      prisma.partnerGroup.findUniqueOrThrow({
        where: {
          ...(groupIdOrSlug.startsWith("grp_")
            ? {
                id: groupIdOrSlug,
              }
            : {
                programId_slug: {
                  programId,
                  slug: groupIdOrSlug,
                },
              }),
          programId,
        },
        include: {
          utmTemplate: true,
          partnerGroupDefaultLinks: {
            where: {
              id: params.defaultLinkId,
            },
          },
          program: {
            select: {
              domain: true,
            },
          },
        },
      }),

      getDomainOrThrow({
        workspace,
        domain,
      }),
    ]);

    if (group.partnerGroupDefaultLinks.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: `Default link ${params.defaultLinkId} not found for this group.`,
      });
    }

    const defaultLink = group.partnerGroupDefaultLinks[0];

    // Domain change detected, we should do the following
    // - Update the program's domain
    // - Update all default links across groups to use the new domain
    // - Update all partner links to use the new domain (via cron job)
    if (domain !== group.program.domain) {
      await prisma.$transaction([
        prisma.program.update({
          where: {
            id: programId,
          },
          data: {
            domain,
          },
        }),

        prisma.partnerGroupDefaultLink.updateMany({
          where: {
            programId,
          },
          data: {
            domain,
          },
        }),
      ]);

      // Queue domain update for all partner links
      waitUntil(
        queueDomainUpdate({
          newDomain: domain,
          oldDomain: defaultLink.domain,
          programId,
        }),
      );
    }

    try {
      const updatedDefaultLink = await prisma.partnerGroupDefaultLink.update({
        where: {
          id: defaultLink.id,
        },
        data: {
          domain,
          url: group.utmTemplate
            ? constructURLFromUTMParams(
                url,
                extractUtmParams(group.utmTemplate),
              )
            : url,
        },
      });

      if (updatedDefaultLink.url !== defaultLink.url) {
        waitUntil(
          qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/update-default-links`,
            body: {
              defaultLinkId: defaultLink.id,
            },
          }),
        );
      }

      return NextResponse.json(
        PartnerGroupDefaultLinkSchema.parse(updatedDefaultLink),
      );
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A default link with this URL already exists.",
        });
      }

      throw new DubApiError({
        code: "unprocessable_entity",
        message: error.message,
      });
    }
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

// DELETE /api/groups/[groupIdOrSlug]/default-links/[defaultLinkId] - delete a default link for a group
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { groupIdOrSlug } = params;

    const group = await prisma.partnerGroup.findUniqueOrThrow({
      where: {
        ...(groupIdOrSlug.startsWith("grp_")
          ? {
              id: groupIdOrSlug,
            }
          : {
              programId_slug: {
                programId,
                slug: groupIdOrSlug,
              },
            }),
        programId,
      },
      include: {
        partnerGroupDefaultLinks: {
          where: {
            id: params.defaultLinkId,
          },
        },
      },
    });

    if (group.partnerGroupDefaultLinks.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: `Default link ${params.defaultLinkId} not found for this group.`,
      });
    }

    await prisma.partnerGroupDefaultLink.delete({
      where: {
        id: group.partnerGroupDefaultLinks[0].id,
      },
    });

    return NextResponse.json({
      id: group.partnerGroupDefaultLinks[0].id,
    });
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
