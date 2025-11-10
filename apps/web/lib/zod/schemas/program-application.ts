import { z } from "zod";
import { EnrolledPartnerSchema, PartnerOnlinePresenceSchema } from "./partners";
import { ProgramEnrollmentSchema } from "./programs";

export const partnerApplicationWebhookSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    companyName: true,
    email: true,
    image: true,
    description: true,
    country: true,
  })
    .merge(
      ProgramEnrollmentSchema.pick({
        groupId: true,
        status: true,
      }),
    )
    .merge(
      PartnerOnlinePresenceSchema.pick({
        website: true,
        youtube: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        tiktok: true,
      }),
    ),
  applicationFormData: z
    .array(
      z.object({
        label: z.string(),
        value: z.string().nullable(),
      }),
    )
    .nullable(),
});
