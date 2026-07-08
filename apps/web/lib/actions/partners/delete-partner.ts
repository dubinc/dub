"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@/lib/prisma";
import { deletePartnerSchema } from "@/lib/zod/schemas/partners";
import { ProgramEnrollmentStatus } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const DELETABLE_STATUSES: ProgramEnrollmentStatus[] = [
  "deactivated",
  "rejected",
  "banned",
  "pending",
];

const STATUSES_COUNTED_IN_USAGE: ProgramEnrollmentStatus[] = [
  "banned",
  "deactivated",
];

// Permanently delete a partner from a program (zero stats only)
export const deletePartnerAction = authActionClient
  .inputSchema(deletePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: true,
        links: true,
        programPartnerTags: {
          include: {
            partnerTag: true,
          },
        },
      },
    });

    if (!DELETABLE_STATUSES.includes(programEnrollment.status)) {
      throw new Error(
        "Only deactivated, rejected, banned, or pending partners can be permanently deleted.",
      );
    }

    if (
      programEnrollment.totalClicks > 0 ||
      programEnrollment.totalLeads > 0 ||
      programEnrollment.totalSales > 0
    ) {
      throw new Error(
        "Partner has clicks, leads, or sales and cannot be permanently deleted.",
      );
    }

    const { partner, links, programPartnerTags, ...enrollment } =
      programEnrollment;

    await Promise.allSettled([
      bulkDeleteLinks(
        links.map((link) => ({
          ...link,
          programEnrollment: {
            groupId: enrollment.groupId,
            programPartnerTags,
          },
        })),
      ),

      prisma.link.deleteMany({
        where: {
          id: {
            in: links.map((link) => link.id),
          },
        },
      }),

      prisma.fraudEvent.deleteMany({
        where: {
          programId,
          partnerId,
        },
      }),

      prisma.fraudEventGroup.deleteMany({
        where: {
          programId,
          partnerId,
        },
      }),

      prisma.message.deleteMany({
        where: {
          programId,
          partnerId,
        },
      }),

      prisma.discoveredPartner.delete({
        where: {
          programId_partnerId: {
            partnerId,
            programId,
          },
        },
      }),
    ]);

    const shouldDecrementUsage = STATUSES_COUNTED_IN_USAGE.includes(
      enrollment.status,
    );

    await prisma.$transaction([
      prisma.programEnrollment.delete({
        where: {
          id: enrollment.id,
        },
      }),
      ...(shouldDecrementUsage
        ? [
            prisma.project.update({
              where: {
                id: workspace.id,
              },
              data: {
                partnersUsage: {
                  decrement: 1,
                },
              },
            }),
          ]
        : []),
    ]);

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: "partner.deleted",
        description: `Partner ${partner.id} permanently deleted`,
        actor: user,
        targets: [
          {
            type: "partner",
            id: partner.id,
            metadata: partner,
          },
        ],
      }),
    );
  });
