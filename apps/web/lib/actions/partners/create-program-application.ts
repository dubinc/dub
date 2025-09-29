"use server";

import { createId } from "@/lib/api/create-id";
import { notifyPartnerApplication } from "@/lib/api/partners/notify-partner-application";
import { getIP } from "@/lib/api/utils/get-ip";
import { getSession } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { ratelimit } from "@/lib/upstash";
import { createProgramApplicationSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import {
  Partner,
  PartnerGroup,
  Program,
  ProgramEnrollment,
} from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { addDays } from "date-fns";
import { cookies } from "next/headers";
import z from "../../zod";
import { actionClient } from "../safe-action";
import { programApplicationFormWebsiteAndSocialsFieldWithValueSchema } from "@/lib/zod/schemas/program-application-form";

export type PartnerData = { name: string, country: string }

interface Response {
  programApplicationId: string;
  programEnrollmentId?: string;
  partnerData: PartnerData;
}

type ProgramApplicationData = z.infer<typeof createProgramApplicationSchema>

type WebsiteAndSocialsData = z.infer<typeof programApplicationFormWebsiteAndSocialsFieldWithValueSchema>

// Create a program application (or enrollment if a partner is already logged in)
export const createProgramApplicationAction = actionClient
  .schema(createProgramApplicationSchema)
  .action(async ({ parsedInput }): Promise<Response> => {
    const { programId, groupId } = parsedInput;

    // Limit to 3 requests per minute per program per IP
    const { success } = await ratelimit(3, "1 m").limit(
      `create-program-application:${programId}:${await getIP()}`,
    );

    if (!success) {
      throw new Error("Too many requests. Please try again later.");
    }

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        groups: {
          where: {
            ...(groupId ? { id: groupId } : { slug: "default" }),
          },
        },
      },
    });

    // this should never happen, but just in case
    if (!program.groups.length) {
      throw new Error("This program has no groups.");
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

    if (existingPartner) {
      return createApplicationAndEnrollment({
        program,
        data: parsedInput,
        partner: existingPartner,
        group: program.groups[0],
      });
    }

    const application = await createApplication({
      program,
      data: parsedInput,
      group: program.groups[0],
    });

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/program-application-reminder`,
      delay: 15 * 60, // 15 minutes
      body: {
        applicationId: application.programApplicationId,
      },
    });

    return application;
  });

async function createApplicationAndEnrollment({
  partner,
  program,
  data,
  group,
}: {
  partner: Partner & { programs: ProgramEnrollment[] };
  program: Program;
  data: z.infer<typeof createProgramApplicationSchema>;
  group: PartnerGroup;
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
        ...addWebsiteAndSocialsToData(data),
        id: applicationId,
        programId: program.id,
        groupId: group.id,
      },
    }),

    prisma.programEnrollment.create({
      data: {
        id: enrollmentId,
        partnerId: partner.id,
        programId: program.id,
        status: "pending",
        applicationId,
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
      },
    }),
  ]);

  waitUntil(
    (async () => {
      await Promise.all([
        notifyPartnerApplication({
          partner,
          program,
          application,
        }),

        // Auto-approve the partner
        program.autoApprovePartnersEnabledAt
          ? qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/auto-approve-partner`,
            delay: 5 * 60,
            body: {
              programId: program.id,
              partnerId: partner.id,
            },
          })
          : Promise.resolve(null),
      ]);
    })(),
  );

  return {
    programApplicationId: applicationId,
    programEnrollmentId: enrollmentId,
    partnerData: {
      name: data.name,
      country: data.country,
    }
  };
}

async function createApplication({
  program,
  data,
  group,
}: {
  program: Program;
  data: z.infer<typeof createProgramApplicationSchema>;
  group: PartnerGroup;
}) {
  const application = await prisma.programApplication.create({
    data: {
      ...addWebsiteAndSocialsToData(data),
      id: createId({ prefix: "pga_" }),
      programId: program.id,
      groupId: group.id,
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
      expires: addDays(new Date(), 7), // persist for 7 days
    },
  );

  return {
    programApplicationId: application.id,
    partnerData: {
      name: data.name,
      country: data.country,
    }
  };
}

function addWebsiteAndSocialsToData(data: ProgramApplicationData) {
  if (data.formData) {
    const websitesAndSocials = data.formData.fields.find((field) => field.type === "website-and-socials") as WebsiteAndSocialsData;

    if (!websitesAndSocials) {
      return data
    }

    return {
      ...data,
      website: websitesAndSocials.data.find((field) => field.type === "website")?.value,
      youtube: websitesAndSocials.data.find((field) => field.type === "youtube")?.value,
      twitter: websitesAndSocials.data.find((field) => field.type === "twitter")?.value,
      linkedin: websitesAndSocials.data.find((field) => field.type === "linkedin")?.value,
      instagram: websitesAndSocials.data.find((field) => field.type === "instagram")?.value,
      tiktok: websitesAndSocials.data.find((field) => field.type === "tiktok")?.value,
    };
  }

  return data
}
