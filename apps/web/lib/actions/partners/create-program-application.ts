"use server";

import { createId, getIP } from "@/lib/api/utils";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { Partner, Program, ProgramEnrollment } from "@prisma/client";
import { addDays } from "date-fns";
import { cookies } from "next/headers";
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

// Create a program application (or enrollment if a partner is already logged in)
export const createProgramApplicationAction = actionClient
  .schema(createProgramApplicationSchema)
  .action(
    async ({
      parsedInput,
    }): Promise<
      | { ok: false; message?: string }
      | { ok: true; programApplicationId: string }
      | { ok: true; programApplicationId: string; programEnrollmentId: string }
    > => {
      const { programId, ...data } = parsedInput;

      // Limit to 3 requests per minute per program per IP
      const { success } = await ratelimit(3, "1 m").limit(
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

        const session = await getSession();

        // Get currently logged in partner
        const existingPartner = session?.user.id
          ? await prisma.partner.findFirst({
              where: {
                users: { some: { userId: session.user.id } },
              },
              include: {
                programs: true,
              },
            })
          : null;

        if (existingPartner)
          return createApplicationAndEnrollment(
            existingPartner,
            program,
            parsedInput,
          );
        else return createApplication(program, parsedInput);
      } catch (e) {
        console.error(e);
        return {
          ok: false,
        };
      }
    },
  );

async function createApplicationAndEnrollment(
  partner: Partner & { programs: ProgramEnrollment[] },
  program: Program,
  data: z.infer<typeof createProgramApplicationSchema>,
): Promise<
  | { ok: false; message?: string }
  | { ok: true; programApplicationId: string; programEnrollmentId: string }
> {
  // Check if ProgramEnrollment already exists
  if (partner.programs.some((p) => p.id === program.id))
    return {
      ok: false,
      message: "You have already applied to this program.",
    };

  const application = await prisma.programApplication.create({
    data: {
      ...data,
      id: createId({ prefix: "pga_" }),
      programId: program.id,
    },
  });

  const enrollment = await prisma.programEnrollment.create({
    data: {
      id: createId({ prefix: "pge_" }),
      partnerId: partner.id,
      programId: program.id,
      status: "pending",
      applicationId: application.id,
    },
  });

  return {
    ok: true,
    programApplicationId: application.id,
    programEnrollmentId: enrollment.id,
  };
}

async function createApplication(
  program: Program,
  data: z.infer<typeof createProgramApplicationSchema>,
): Promise<
  { ok: false; message?: string } | { ok: true; programApplicationId: string }
> {
  const application = await prisma.programApplication.create({
    data: {
      ...data,
      id: createId({ prefix: "pga_" }),
      programId: program.id,
    },
  });

  // Add application ID to cookie
  const cookieStore = await cookies();
  const existingApplicationIds =
    cookieStore.get("programApplicationIds")?.value?.split(",") || [];
  cookieStore.set(
    "programApplicationIds",
    [...existingApplicationIds, application.id].join(","),
    {
      httpOnly: true,
      expires: addDays(new Date(), 1),
    },
  );
  return { ok: true, programApplicationId: application.id };
}
