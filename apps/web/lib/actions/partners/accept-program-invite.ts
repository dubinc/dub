"use server";

import { createId } from "@/lib/api/utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";
import { backfillLinkData } from "./backfill-link-data";
import { enrollDotsUserApp } from "./enroll-dots-user-app";

export const acceptProgramInviteAction = authPartnerActionClient
  .schema(
    z.object({
      partnerId: z.string(),
      programInviteId: z.string(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programInviteId } = parsedInput;

    if (!partner.dotsUserId) {
      throw new Error("Partner does not have a Dots user ID");
    }

    const programInvite = await prisma.programInvite.findUniqueOrThrow({
      where: { id: programInviteId },
    });

    // enroll partner in program and delete the invite
    const [programEnrollment, _] = await Promise.all([
      prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          programId: programInvite.programId,
          linkId: programInvite.linkId,
          partnerId: partner.id,
          status: "approved",
        },
        include: {
          program: {
            include: {
              workspace: true,
            },
          },
        },
      }),
      prisma.programInvite.delete({
        where: { id: programInvite.id },
      }),
    ]);

    const workspace = programEnrollment.program.workspace;

    if (!workspace.dotsAppId) {
      throw new Error("Workspace does not have a Dots app ID");
    }

    const res = await Promise.all([
      enrollDotsUserApp({
        partner,
        dotsAppId: workspace.dotsAppId,
        programEnrollmentId: programEnrollment.id,
      }),
      backfillLinkData(programEnrollment.id),
    ]);

    return {
      id: programEnrollment.id,
    };
  });
