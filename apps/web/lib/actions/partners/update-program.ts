"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { ProgramSchema, updateProgramSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";

const schema = updateProgramSchema.partial().extend({
  workspaceId: z.string(),
  applyHoldingPeriodDaysToAllGroups: z.boolean().optional(),
});

export const updateProgramAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const {
      supportEmail,
      helpUrl,
      termsUrl,
      minPayoutAmount,
      messagingEnabledAt,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const updatedProgram = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        supportEmail,
        helpUrl,
        termsUrl,
        minPayoutAmount,
        ...(messagingEnabledAt !== undefined &&
          (getPlanCapabilities(workspace.plan).canMessagePartners ||
            messagingEnabledAt === null) && { messagingEnabledAt }),
      },
    });

    waitUntil(
      recordAuditLog({
        workspaceId: workspace.id,
        programId: program.id,
        action: "program.updated",
        description: `Program ${program.name} updated`,
        actor: user,
        targets: [
          {
            type: "program",
            id: program.id,
            metadata: updatedProgram,
          },
        ],
      }),
    );

    return {
      success: true,
      program: ProgramSchema.parse(updatedProgram),
    };
  });
