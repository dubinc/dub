"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { Category } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  autoApprovePartners: z.boolean().optional(),
  marketplaceEnabled: z.boolean().optional(),
  category: z.nativeEnum(Category).nullish(),
});

export const updateApplicationSettingsAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { autoApprovePartners, marketplaceEnabled, category } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        ...(autoApprovePartners !== undefined && {
          autoApprovePartnersEnabledAt: autoApprovePartners ? new Date() : null,
        }),
        ...(marketplaceEnabled !== undefined && {
          marketplaceEnabledAt: marketplaceEnabled ? new Date() : null,
        }),
        ...(category && {
          categories: {
            deleteMany: {},
            create: [
              {
                category,
              },
            ],
          },
        }),
      },
    });

    waitUntil(
      Promise.allSettled([
        ...(autoApprovePartners !== undefined
          ? [
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
            ]
          : []),
      ]),
    );

    return program;
  });
