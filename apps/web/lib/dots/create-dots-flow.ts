import { prisma } from "@/lib/prisma";
import { Partner } from "@prisma/client";
import z from "../zod";
import { createDotsUser } from "./create-dots-user";
import { DOTS_API_URL } from "./env";
import { dotsHeaders } from "./utils";

const responseSchema = z.object({
  id: z.string(),
  link: z.string(),
});

export const createDotsFlow = async ({
  partner,
  steps = ["payout"],
}: {
  partner: Pick<Partner, "id" | "dotsUserId" | "dotsAppId">;
  steps?: string[];
}) => {
  let dotsUserId = partner.dotsUserId;
  let dotsAppId = partner.dotsAppId;

  // Create Dots user if it doesn't exist
  if (!partner.dotsUserId) {
    // TODO: [dots] we probably need to actually create separate Dots users for each partner <-> <-> workspace connection
    const firstEnrolledProgramWorkspace =
      await prisma.programEnrollment.findFirst({
        select: {
          program: {
            select: {
              workspace: {
                select: {
                  dotsAppId: true,
                },
              },
            },
          },
        },
        where: {
          partnerId: partner.id,
          status: "approved",
        },
      });

    dotsAppId =
      firstEnrolledProgramWorkspace?.program.workspace.dotsAppId ?? null;
    if (!dotsAppId) {
      throw new Error("No eligible program enrollment found.");
    }

    // TODO: [dots] we need to gather real user info for this
    const dotsUser = await createDotsUser({
      dotsAppId,
      firstName: "Test",
      lastName: "Tester",
      email: "tim+tester@dub.co",
      countryCode: "1",
      phoneNumber: "4129268662",
    });

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        // TODO: [dots] might need to move these to the ProgramEnrollment table or somewhere between partners and workspaces
        dotsUserId: dotsUser.id,
        dotsAppId,
      },
    });

    dotsUserId = dotsUser.id;
  }

  const response = await fetch(`${DOTS_API_URL}/flows`, {
    method: "POST",
    headers: dotsHeaders({ dotsAppId: dotsAppId ?? undefined }),
    body: JSON.stringify({
      steps,
      user_id: dotsUserId,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());

    throw new Error(`Failed to create Dots flow.`);
  }

  return { ...responseSchema.parse(await response.json()), dotsAppId };
};
