import * as z from "zod/v4";
import {
  EnrolledPartnerSchema,
  PartnerPartnerPlatformsSchema,
} from "./partners";
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
    .extend(
      ProgramEnrollmentSchema.pick({
        groupId: true,
        status: true,
      }).shape,
    )
    .extend(
      PartnerPartnerPlatformsSchema.pick({
        website: true,
        youtube: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        tiktok: true,
      }).shape,
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
