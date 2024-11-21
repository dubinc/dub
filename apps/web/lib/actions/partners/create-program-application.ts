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
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().min(1).max(100),
  website: z.string().trim().max(100).optional(),
  proposal: z.string().trim().min(1).max(5000),
  comments: z.string().trim().max(5000).optional(),
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
      const { programId } = parsedInput;

      // Limit to 3 requests per minute per program per IP
      const { success } = await ratelimit(3, "1 m").limit(
        `create-program-application:${programId}:${getIP()}`,
      );

      if (!success) {
        return {
          ok: false,
          message: "Too many requests. Please try again later.",
        };
      }

      const program = await prisma.program.findUnique({
        where: { id: programId },
      });

      if (!program) {
        return { ok: false, message: "Program not found." };
      }

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

      try {
        if (existingPartner) {
          return createApplicationAndEnrollment({
            program,
            data: parsedInput,
            partner: existingPartner,
          });
        }

        return createApplication({
          program,
          data: parsedInput,
        });
      } catch (e) {
        console.error(e);
        return {
          ok: false,
        };
      }
    },
  );

async function createApplicationAndEnrollment({
  partner,
  program,
  data,
}: {
  partner: Partner & { programs: ProgramEnrollment[] };
  program: Program;
  data: z.infer<typeof createProgramApplicationSchema>;
}): Promise<
  | { ok: false; message?: string }
  | { ok: true; programApplicationId: string; programEnrollmentId: string }
> {
  // Check if ProgramEnrollment already exists
  if (partner.programs.some((p) => p.programId === program.id)) {
    return {
      ok: false,
      message: "You have already applied to this program.",
    };
  }

  const applicationId = createId({ prefix: "pga_" });
  const enrollmentId = createId({ prefix: "pge_" });

  await Promise.all([
    prisma.programApplication.create({
      data: {
        ...data,
        id: applicationId,
        programId: program.id,
        partnerId: partner.id,
      },
    }),

    prisma.programEnrollment.create({
      data: {
        id: enrollmentId,
        partnerId: partner.id,
        programId: program.id,
        status: "pending",
        applicationId,
      },
    }),
  ]);

  return {
    ok: true,
    programApplicationId: applicationId,
    programEnrollmentId: enrollmentId,
  };
}

async function createApplication({
  program,
  data,
}: {
  program: Program;
  data: z.infer<typeof createProgramApplicationSchema>;
}): Promise<
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
  const cookieStore = cookies();

  const existingApplicationIds =
    cookieStore.get("programApplicationIds")?.value?.split(",") || [];

  cookieStore.set(
    "programApplicationIds",
    [...existingApplicationIds, application.id].join(","),
    {
      httpOnly: true,
      expires: addDays(new Date(), 7), // persist for 7 days
    },
  );

  return {
    ok: true,
    programApplicationId: application.id,
  };
}
