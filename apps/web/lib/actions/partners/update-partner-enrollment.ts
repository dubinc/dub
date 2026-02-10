"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { throwIfExistingTenantEnrollmentExists } from "@/lib/api/partners/throw-if-existing-tenant-id-exists";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const updatePartnerEnrollmentSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
  tenantId: z.string().nullable(),
  customerDataSharingEnabledAt: z.coerce.date().nullable(),
});

// Update a partner's program enrollment data
export const updatePartnerEnrollmentAction = authActionClient
  .inputSchema(updatePartnerEnrollmentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, tenantId, customerDataSharingEnabledAt } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partner, tenantId: existingTenantId } =
      await getProgramEnrollmentOrThrow({
        partnerId,
        programId,
        include: {
          partner: true,
        },
      });

    const where = {
      programId,
      partnerId,
    };

    if (tenantId && tenantId !== existingTenantId) {
      await throwIfExistingTenantEnrollmentExists({
        tenantId,
        programId,
      });
    }

    const programEnrollment = await prisma.$transaction(async (tx) => {
      await tx.link.updateMany({
        where,
        data: {
          tenantId,
        },
      });

      return await tx.programEnrollment.update({
        where: {
          partnerId_programId: where,
        },
        data: {
          tenantId,
          customerDataSharingEnabledAt,
        },
        include: {
          links: {
            include: { ...includeTags, ...includeProgramEnrollment },
          },
        },
      });
    });

    waitUntil(
      Promise.allSettled([
        recordLink(programEnrollment.links),
        recordAuditLog({
          workspaceId: workspace.id,
          programId,
          action: "partner.enrollment_updated",
          description: `Partner ${partnerId} enrollment updated`,
          actor: user,
          targets: [
            {
              type: "partner",
              id: partnerId,
              metadata: partner,
            },
          ],
        }),
      ]),
    );
  });
