import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  DEFAULT_PARTNER_GROUP,
  GroupSchema,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, constructURLFromUTMParams } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/groups/[groupIdOrSlug] - get information about a group
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
      includeExpandedFields: true,
    });

    return NextResponse.json(GroupSchema.parse(group));
  },
  {
    requiredPermissions: ["groups.read"],
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

// PATCH /api/groups/[groupIdOrSlug] – update a group for a workspace
export const PATCH = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
    });

    const {
      name,
      slug,
      color,
      maxPartnerLinks,
      additionalLinks,
      utmTemplateId,
      linkStructure,
    } = updateGroupSchema.parse(await parseRequestBody(req));

    // Only check slug uniqueness if slug is being updated
    if (slug && slug.toLowerCase() !== group.slug.toLowerCase()) {
      if (group.slug === DEFAULT_PARTNER_GROUP.slug) {
        throw new DubApiError({
          code: "bad_request",
          message: "You cannot change the slug of the default group.",
        });
      }

      const existingGroup = await prisma.partnerGroup.findUnique({
        where: {
          programId_slug: {
            programId,
            slug,
          },
        },
      });

      if (existingGroup) {
        throw new DubApiError({
          code: "bad_request",
          message: `Group with slug ${slug} already exists in your program.`,
        });
      }
    }

    // Find the UTM template
    const utmTemplate = utmTemplateId
      ? await prisma.utmTemplate.findUniqueOrThrow({
          where: {
            id: utmTemplateId,
            projectId: workspace.id,
          },
        })
      : null;

    // Deduplicate additionalLinks by domain, keeping the first occurrence
    const deduplicatedAdditionalLinks = additionalLinks
      ? additionalLinks.filter(
          (link, index, array) =>
            array.findIndex((l) => l.domain === link.domain) === index,
        )
      : additionalLinks;

    const additionalLinksInput = deduplicatedAdditionalLinks
      ? deduplicatedAdditionalLinks.length > 0
        ? deduplicatedAdditionalLinks
        : Prisma.DbNull
      : undefined;

    const updatedGroup = await prisma.partnerGroup.update({
      where: {
        id: group.id,
      },
      data: {
        name,
        slug,
        color,
        ...(additionalLinksInput && { additionalLinks: additionalLinksInput }),
        maxPartnerLinks,
        utmTemplateId,
        linkStructure,
      },
      include: {
        clickReward: true,
        leadReward: true,
        saleReward: true,
        discount: true,
      },
    });

    waitUntil(
      (async () => {
        const isTemplateAdded = group.utmTemplateId !== utmTemplateId;

        // If the UTM template is added, update the default links with the UTM parameters
        if (isTemplateAdded && utmTemplate) {
          const defaultLinks = await prisma.partnerGroupDefaultLink.findMany({
            where: {
              groupId: group.id,
            },
          });

          if (defaultLinks.length > 0) {
            for (const defaultLink of defaultLinks) {
              await prisma.partnerGroupDefaultLink.update({
                where: {
                  id: defaultLink.id,
                },
                data: {
                  url: constructURLFromUTMParams(
                    defaultLink.url,
                    extractUtmParams(utmTemplate),
                  ),
                },
              });
            }
          }
        }

        await Promise.allSettled([
          recordAuditLog({
            workspaceId: workspace.id,
            programId,
            action: "group.updated",
            description: `Group ${updatedGroup.name} (${group.id}) updated`,
            actor: session.user,
            targets: [
              {
                type: "group",
                id: group.id,
                metadata: updatedGroup,
              },
            ],
          }),

          group.utmTemplateId !== updatedGroup.utmTemplateId &&
            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/sync-utm`,
              body: {
                groupId: group.id,
              },
            }),
        ]);
      })(),
    );

    return NextResponse.json(GroupSchema.parse(updatedGroup));
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

// DELETE /api/groups/[groupIdOrSlug] – delete a group for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { groupIdOrSlug } = params;

    const [group, defaultGroup] = await Promise.all([
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
        },
        include: {
          partners: true,
        },
      }),
      prisma.partnerGroup.findUniqueOrThrow({
        where: {
          programId_slug: {
            programId,
            slug: DEFAULT_PARTNER_GROUP.slug,
          },
        },
      }),
    ]);

    if (group.slug === DEFAULT_PARTNER_GROUP.slug) {
      throw new DubApiError({
        code: "forbidden",
        message: "You cannot delete the default group of your program.",
      });
    }
    await prisma.$transaction(async (tx) => {
      // 1. Update all partners in the group to the default group
      await tx.programEnrollment.updateMany({
        where: {
          groupId: group.id,
        },
        data: {
          groupId: defaultGroup.id,
          clickRewardId: defaultGroup.clickRewardId,
          leadRewardId: defaultGroup.leadRewardId,
          saleRewardId: defaultGroup.saleRewardId,
          discountId: defaultGroup.discountId,
        },
      });

      // 2. Delete the group's rewards
      if (group.clickRewardId || group.leadRewardId || group.saleRewardId) {
        await tx.reward.deleteMany({
          where: {
            id: {
              in: [
                group.clickRewardId,
                group.leadRewardId,
                group.saleRewardId,
              ].filter(Boolean) as string[],
            },
          },
        });
      }

      // 3. Delete the group's discount
      if (group.discountId) {
        await tx.discount.delete({
          where: {
            id: group.discountId,
          },
        });
      }

      // 4. Delete the group
      await tx.partnerGroup.delete({
        where: {
          id: group.id,
        },
      });
    });

    waitUntil(
      Promise.allSettled([
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/remap-default-links`,
          body: {
            programId,
            groupId: defaultGroup.id,
            partnerIds: group.partners.map(({ partnerId }) => partnerId),
            userId: session.user.id,
            isGroupDeleted: true,
          },
        }),

        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "group.deleted",
          description: `Group ${group.name} (${group.id}) deleted`,
          actor: session.user,
          targets: [
            {
              type: "group",
              id: group.id,
              metadata: group,
            },
          ],
        }),
      ]),
    );

    return NextResponse.json({ id: group.id });
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
