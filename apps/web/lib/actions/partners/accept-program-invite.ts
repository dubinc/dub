"use server";

import { createId } from "@/lib/api/utils";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";
import { backfillLinkData } from "./backfill-link-data";

const acceptProgramInviteSchema = z.object({
  programInviteId: z.string(),
});

export const acceptProgramInviteAction = authPartnerActionClient
  .schema(acceptProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programInviteId } = parsedInput;

    const programInvite = await prisma.programInvite.findUniqueOrThrow({
      where: { id: programInviteId },
      include: {
        program: {
          select: {
            discounts: true,
          },
        },
      },
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
          discountId:
            programInvite.program.discounts.length > 0
              ? programInvite.program.discounts[0].id
              : null,
        },
      }),
      prisma.programInvite.delete({
        where: { id: programInvite.id },
      }),
    ]);

    waitUntil(
      backfillLinkData({
        programEnrollmentId: programEnrollment.id,
        linkId: programInvite.linkId,
      }),
    );

    return {
      id: programEnrollment.id,
    };
  });
