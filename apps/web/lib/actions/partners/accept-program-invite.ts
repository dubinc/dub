"use server";

import { createDotsUser } from "@/lib/dots/create-dots-user";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

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
      include: {
        program: { select: { workspace: { select: { dotsAppId: true } } } },
      },
    });

    console.log("programInvite", programInvite);

    // enroll partner in program and delete the invite
    const [programEnrollment, dotsUser, _] = await Promise.all([
      prisma.programEnrollment.create({
        data: {
          programId: programInvite.programId,
          linkId: programInvite.linkId,
          partnerId: partner.id,
          status: "approved",
        },
      }),
      retrieveDotsUser({
        dotsUserId: partner.dotsUserId,
        partner,
      }),
      prisma.programInvite.delete({
        where: { id: programInvite.id },
      }),
    ]);

    console.log({ programEnrollment, dotsUser });

    const workspace = programInvite.program.workspace;

    if (workspace.dotsAppId) {
      const newDotsUser = await createDotsUser({
        dotsAppId: workspace.dotsAppId, // we need to create a new Dots user under the Program's Dots App
        userInfo: {
          firstName: dotsUser.first_name,
          lastName: dotsUser.last_name,
          email: dotsUser.email,
          countryCode: dotsUser.phone_number.country_code,
          phoneNumber: dotsUser.phone_number.phone_number,
        },
      });

      console.log({ newDotsUser });

      await prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: { dotsUserId: newDotsUser.id },
      });
    }
  });
