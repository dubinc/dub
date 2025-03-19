"use server";

import { createId } from "@/lib/api/create-id";
import { notifyPartnerApplication } from "@/lib/api/partners/notify-partner-application";
import { getIP } from "@/lib/api/utils";
import { getSession } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Partner, Program, ProgramEnrollment } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
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
    }): Promise<{
      programApplicationId: string;
      programEnrollmentId?: string;
    }> => {
      const { programId } = parsedInput;

      // Limit to 3 requests per minute per program per IP
      const { success } = await ratelimit(3, "1 m").limit(
        `create-program-application:${programId}:${getIP()}`,
      );

      if (!success) {
        throw new Error("Too many requests. Please try again later.");
      }

      const program = await prisma.program.findUniqueOrThrow({
        where: { id: programId },
      });

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
}) {
  // Check if ProgramEnrollment already exists
  if (partner.programs.some((p) => p.programId === program.id)) {
    throw new Error("You have already applied to this program.");
  }

  const applicationId = createId({ prefix: "pga_" });
  const enrollmentId = createId({ prefix: "pge_" });

  const [application, _] = await Promise.all([
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

  waitUntil(
    notifyPartnerApplication({
      partner,
      program,
      application,
    }),
  );

  return {
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
}) {
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
    programApplicationId: application.id,
  };
}
