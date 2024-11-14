"use server";

import { createId, getIP } from "@/lib/api/utils";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { Partner, ProgramApplicationStatus } from "@prisma/client";
import z from "../../zod";
import { actionClient } from "../safe-action";

const createProgramApplicationSchema = z.object({
  programId: z.string(),
  name: z.string(),
  email: z.string(),
  website: z.string().optional(),
  plan: z.string(),
  comments: z.string().optional(),
});

// Onboard a new partner
export const createProgramApplicationAction = actionClient
  .schema(createProgramApplicationSchema)
  .action(async ({ parsedInput }) => {
    const { programId, ...data } = parsedInput;

    // Limit to 2 requests per minute per program per IP
    const { success } = await ratelimit(2, "1 m").limit(
      `create-program-application:${programId}:${getIP()}`,
    );

    if (!success)
      return {
        ok: false,
        message: "Too many requests. Please try again later.",
      };

    try {
      const program = await prisma.program.findUnique({
        where: { id: programId },
      });

      if (!program) return { ok: false, message: "Program not found." };

      const existingApplication = await prisma.programApplication.findFirst({
        where: {
          programId: program.id,
          email: data.email,
          status: {
            not: ProgramApplicationStatus.rejected,
          },
        },
      });

      if (existingApplication)
        return {
          ok: false,
          message: "You have already applied to this program.",
        };

      // Find existing partner to automatically associate
      const existingPartner = await getExistingPartner({
        email: data.email,
        programId: program.id,
      });

      const application = await prisma.programApplication.create({
        data: {
          ...parsedInput,
          id: createId({ prefix: "pga_" }),
          programId: program.id,
          partnerId: existingPartner?.id,
        },
      });

      return { ok: true, programApplicationId: application.id };
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }
  });

async function getExistingPartner({
  email,
  programId,
}: {
  email: string;
  programId: string;
}) {
  const session = await getSession();

  let partner: Partner | null = null;

  // First try any currently logged in user
  if (session?.user.id)
    partner = await prisma.partner.findFirst({
      where: {
        users: { some: { userId: session.user.id } },
        programs: { none: { programId } },
      },
    });

  // Then try to find a matching partner by user email
  if (!partner)
    partner = await prisma.partner.findFirst({
      where: {
        users: {
          some: {
            user: {
              email,
              emailVerified: {
                not: null,
              },
            },
          },
        },
        programs: {
          none: {
            programId,
          },
        },
      },
    });

  return partner;
}
