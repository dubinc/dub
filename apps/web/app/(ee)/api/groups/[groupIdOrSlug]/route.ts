import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { movePartnersToGroup } from "@/lib/api/groups/move-partners-to-group";
import { upsertGroupMoveRules } from "@/lib/api/groups/upsert-group-move-rules";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { GroupWithProgramSchema } from "@/lib/zod/schemas/group-with-program";
import {
  DEFAULT_PARTNER_GROUP,
  GroupSchema,
  updateGroupSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, constructURLFromUTMParams } from "@dub/utils";
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

    return NextResponse.json(GroupWithProgramSchema.parse(group));
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
      applicationFormData,
      landerData,
      holdingPeriodDays,
      autoApprovePartners,
      updateAutoApprovePartnersForAllGroups,
      updateHoldingPeriodDaysForAllGroups,
      moveRules,
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

    if (additionalLinks) {
      // check for duplicate link formats
      const linkFormatDomains = additionalLinks.reduce((acc, link) => {
        acc.add(link.domain);
        return acc;
      }, new Set<string>());

      if (linkFormatDomains.size !== additionalLinks.length) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Duplicate link formats found. Please make sure all link formats have unique domains.",
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

    const { workflowId } = await upsertGroupMoveRules({
      workspace,
      group,
      moveRules,
    });

    const [updatedGroup] = await Promise.all([
      prisma.partnerGroup.update({
        where: {
          id: group.id,
        },
        data: {
          name,
          slug,
          color,
          additionalLinks,
          maxPartnerLinks,
          linkStructure,
          utmTemplateId,
          applicationFormData,
          landerData,
          workflowId,
          ...(holdingPeriodDays !== undefined &&
            !updateHoldingPeriodDaysForAllGroups && {
              holdingPeriodDays,
            }),
          ...(autoApprovePartners !== undefined &&
            !updateAutoApprovePartnersForAllGroups && {
              autoApprovePartnersEnabledAt: autoApprovePartners
                ? new Date()
                : null,
            }),
        },
        include: {
          clickReward: true,
          leadReward: true,
          saleReward: true,
          discount: true,
        },
      }),

      // Update auto-approve for all groups if selected
      ...(autoApprovePartners !== undefined &&
      updateAutoApprovePartnersForAllGroups
        ? [
            prisma.partnerGroup.updateMany({
              where: {
                programId,
              },
              data: {
                autoApprovePartnersEnabledAt: autoApprovePartners
                  ? new Date()
                  : null,
              },
            }),
          ]
        : []),
      // Update holding period for all groups if selected
      ...(holdingPeriodDays !== undefined && updateHoldingPeriodDaysForAllGroups
        ? [
            prisma.partnerGroup.updateMany({
              where: {
                programId,
              },
              data: {
                holdingPeriodDays,
              },
            }),
          ]
        : []),
    ]);

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

    while (true) {
      const programEnrollments = await prisma.programEnrollment.findMany({
        where: {
          groupId: group.id,
        },
        take: 100,
      });
      if (programEnrollments.length === 0) {
        break;
      }
      const count = await movePartnersToGroup({
        workspaceId: workspace.id,
        programId,
        partnerIds: programEnrollments.map(({ partnerId }) => partnerId),
        userId: session.user.id,
        group: defaultGroup,
        isGroupDeleted: true,
      });
      console.log(`Moved ${count} partners to the default group`);
    }

    const deletedGroup = await prisma.$transaction(async (tx) => {
      // 1. Delete the group's rewards
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

      // Note: we can't delete this group's discount yet because it is needed
      // for `remap-discount-codes` that runs in movePartnersToGroup
      // but we will delete the Discount in `remap-discount-codes` once there are no remaining discount codes.

      // 2. Delete the group move workflow
      if (group.workflowId) {
        await tx.workflow.delete({
          where: {
            id: group.workflowId,
          },
        });
      }

      // 3. Delete the group
      await tx.partnerGroup.delete({
        where: {
          id: group.id,
        },
      });

      return true;
    });

    if (deletedGroup) {
      waitUntil(
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
      );
    }

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
