"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  autoApprovePartners: z.boolean(),
});

export const updateAutoApprovePartnersAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { autoApprovePartners } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        autoApprovePartnersEnabledAt: autoApprovePartners ? new Date() : null,
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId,
        action: autoApprovePartners
          ? "auto_approve_partner.enabled"
          : "auto_approve_partner.disabled",
        description: autoApprovePartners
          ? "Auto approve partners enabled"
          : "Auto approve partners disabled",
        actor: user,
      }),
    );

    return program;
  });
