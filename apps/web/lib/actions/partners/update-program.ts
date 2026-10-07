"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { revalidateProgramPublicPages } from "@/lib/api/programs/revalidate-program-public-pages";
import {
  ALLOWED_MIN_PAYOUT_AMOUNTS,
  getAllowedMinPayoutAmounts,
} from "@/lib/constants/payouts";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { submittedLeadFormSchema } from "@/lib/zod/schemas/submitted-lead-form";
import { Prisma } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { ProgramSchema, updateProgramSchema } from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = updateProgramSchema.partial().extend({
  workspaceId: z.string(),
  applyHoldingPeriodDaysToAllGroups: z.boolean().optional(),
  referralFormData: submittedLeadFormSchema.optional(),
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
      referralFormData,
      invoiceSettings,
    } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    if (
      minPayoutAmount !== undefined &&
      !getAllowedMinPayoutAmounts(workspace.id).includes(minPayoutAmount)
    ) {
      throw new Error(
        `Invalid minimum payout amount: Must be one of ${ALLOWED_MIN_PAYOUT_AMOUNTS.join(", ")}`,
      );
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const normalizedInvoiceSettings = invoiceSettings
      ? {
          companyName: invoiceSettings.companyName || null,
          address: invoiceSettings.address || null,
          taxId: invoiceSettings.taxId || null,
        }
      : null;

    const hasInvoiceSettings = Boolean(
      normalizedInvoiceSettings?.companyName ||
        normalizedInvoiceSettings?.address ||
        normalizedInvoiceSettings?.taxId,
    );

    const invoiceSettingsUpdate:
      | Prisma.InputJsonValue
      | typeof Prisma.DbNull
      | undefined =
      invoiceSettings === undefined
        ? undefined
        : hasInvoiceSettings && normalizedInvoiceSettings
          ? normalizedInvoiceSettings
          : Prisma.DbNull;

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
        ...(referralFormData !== undefined && {
          referralFormData: referralFormData ?? null,
        }),
        ...(invoiceSettingsUpdate !== undefined && {
          invoiceSettings: invoiceSettingsUpdate,
        }),
      },
    });

    if (updatedProgram.termsUrl !== program.termsUrl) {
      revalidateProgramPublicPages(programId);
    }

    waitUntil(
      Promise.allSettled([
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
      ]),
    );

    return {
      success: true,
      program: ProgramSchema.parse(updatedProgram),
    };
  });
