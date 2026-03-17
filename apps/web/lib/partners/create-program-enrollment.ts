import { createId } from "@/lib/api/create-id";
import { detectAndRecordFraudApplication } from "@/lib/api/fraud/detect-record-fraud-application";
import { notifyPartnerApplication } from "@/lib/api/partners/notify-partner-application";
import { qstash } from "@/lib/cron";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import {
  formatApplicationFormData,
  formatWebsiteAndSocialsFields,
} from "@/lib/partners/format-application-form-data";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { partnerApplicationWebhookSchema } from "@/lib/zod/schemas/program-application";
import { createProgramApplicationSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import {
  Partner,
  PartnerGroup,
  Program,
  ProgramApplication,
  Project,
} from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import {
  ProgramApplicationFormData,
  ProgramApplicationFormDataWithValues,
} from "../types";
import { programApplicationFormWebsiteAndSocialsFieldWithValueSchema } from "../zod/schemas/program-application-form";

export type PartnerData = { name: string; country: string };

type ProgramApplicationData = z.infer<typeof createProgramApplicationSchema>;

type WebsiteAndSocialsData = z.infer<
  typeof programApplicationFormWebsiteAndSocialsFieldWithValueSchema
>;

// Note: Remove this method after the backfill is complete

export async function createProgramEnrollment({
  workspace,
  program,
  partner,
  group,
  data,
  application,
}: {
  workspace: Pick<Project, "id" | "webhookEnabled">;
  program: Program;
  partner: Partner;
  group: PartnerGroup;
  data: z.infer<typeof createProgramApplicationSchema>;
  application: ProgramApplication;
}) {
  const sanitizedData = sanitizeData(data, group);

  const result = evaluateApplicationRequirements({
    applicationRequirements: program.applicationRequirements,
    context: {
      // Always use the partner's country from their profile, if available
      country: partner.country ?? sanitizedData.country,
      email: partner.email,
    },
  });

  if (result.reason === "requirementsNotMet") {
    const qstashResponse = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/auto-reject`,
      delay: 30 * 60, // 30 minutes
      body: {
        programId: program.id,
        partnerId: partner.id,
      },
    });

    if (qstashResponse.messageId) {
      console.log(
        `The partner did not meet the eligibility requirements for this program. Auto-reject job enqueued successfully.`,
        {
          ...qstashResponse,
          programId: program.id,
          partnerId: partner.id,
        },
      );
    }
  }

  const programEnrollment = await prisma.programEnrollment.create({
    data: {
      id: createId({ prefix: "pge_" }),
      partnerId: partner.id,
      programId: program.id,
      status: "pending",
      applicationId: application.id,
      groupId: group.id,
      clickRewardId: group.clickRewardId,
      leadRewardId: group.leadRewardId,
      saleRewardId: group.saleRewardId,
      discountId: group.discountId,
    },
  });

  waitUntil(
    (async () => {
      const applicationFormData = formatApplicationFormData(application).map(
        ({ title, value }) => ({
          label: title,
          value: value !== "" ? value : null,
        }),
      );

      await Promise.all([
        notifyPartnerApplication({
          partner,
          program,
          group,
          application,
        }),

        // Auto-approve the partner if the group has auto-approval enabled
        group.autoApprovePartnersEnabledAt
          ? qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/auto-approve`,
              delay: 5 * 60,
              body: {
                programId: program.id,
                partnerId: partner.id,
              },
            })
          : Promise.resolve(null),

        // Send "partner.application_submitted" webhook
        sendWorkspaceWebhook({
          workspace,
          trigger: "partner.application_submitted",
          data: partnerApplicationWebhookSchema.parse({
            id: application.id,
            createdAt: application.createdAt,
            partner: {
              ...partner,
              ...programEnrollment,
              id: partner.id,
              ...formatWebsiteAndSocialsFields(application),
            },
            applicationFormData,
          }),
        }),

        // Detect and record fraud events for the partner when they apply to a program
        detectAndRecordFraudApplication({
          context: {
            program,
            partner,
          },
        }),
      ]);
    })(),
  );

  return {
    programApplicationId: application.id,
    programEnrollmentId: programEnrollment.id,
    partnerData: {
      name: data.name,
      country: data.country,
    },
  };
}

const sanitizeFormData = (
  formData: ProgramApplicationFormDataWithValues,
  group: PartnerGroup,
): ProgramApplicationFormDataWithValues | null => {
  if (!group.applicationFormData) {
    return null;
  }

  const applicationFormData =
    group.applicationFormData as ProgramApplicationFormData;
  const validFieldIds = new Set(
    applicationFormData.fields.map((field) => field.id),
  );
  const fields = (formData.fields || []).filter((field) =>
    validFieldIds.has(field.id),
  );

  return {
    fields,
  };
};

export function sanitizeData(
  rawData: ProgramApplicationData,
  group: PartnerGroup,
) {
  const { formData: rawFormData, inAppApplication, ...data } = rawData;

  const formData = rawFormData ? sanitizeFormData(rawFormData, group) : null;

  if (!formData) {
    return data;
  }

  const websitesAndSocials = formData.fields.find(
    (field) => field.type === "website-and-socials",
  ) as WebsiteAndSocialsData;

  if (!websitesAndSocials) {
    return {
      ...data,
      formData,
    };
  }

  return {
    ...data,
    formData,
    website: websitesAndSocials.data.find((field) => field.type === "website")
      ?.value,
    youtube: websitesAndSocials.data.find((field) => field.type === "youtube")
      ?.value,
    twitter: websitesAndSocials.data.find((field) => field.type === "twitter")
      ?.value,
    linkedin: websitesAndSocials.data.find((field) => field.type === "linkedin")
      ?.value,
    instagram: websitesAndSocials.data.find(
      (field) => field.type === "instagram",
    )?.value,
    tiktok: websitesAndSocials.data.find((field) => field.type === "tiktok")
      ?.value,
  };
}
