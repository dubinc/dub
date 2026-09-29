import { ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import {
  EnrolledPartnerSchema,
  getPartnersQuerySchema,
  OldPartnerPlatformsFields,
  partnerPlatformSchema,
  PARTNERS_MAX_PAGE_SIZE,
} from "./partners";
import { ProgramEnrollmentSchema } from "./programs";

export const PartnerApplicationSchema = z.object({
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
    .extend(OldPartnerPlatformsFields.shape)
    .extend({
      platforms: z
        .array(
          partnerPlatformSchema.pick({
            type: true,
            identifier: true,
            verifiedAt: true,
          }),
        )
        .nullish()
        .describe(
          "The partner's website and social profiles, including when each was verified.",
        ),
    }),
  applicationFormData: z
    .array(
      z.object({
        label: z.string(),
        value: z.string().nullable(),
      }),
    )
    .nullable(),
});

export const partnerApplicationWebhookSchema = PartnerApplicationSchema;

const ProgramApplicationStatuses = [
  ProgramEnrollmentStatus.pending,
  ProgramEnrollmentStatus.rejected,
];

export const getPartnerApplicationsQuerySchema = getPartnersQuerySchema
  .pick({
    country: true,
    groupId: true,
    search: true,
    sortOrder: true,
  })
  .extend({
    status: z
      .enum(ProgramApplicationStatuses)
      .default(ProgramEnrollmentStatus.pending)
      .describe(
        "Filter applications by enrollment status. One of `pending` or `rejected`. Defaults to `pending`.",
      ),
    ...getPaginationQuerySchema({
      pageSize: PARTNERS_MAX_PAGE_SIZE,
    }),
  });

export const getProgramApplicationsCountQuerySchema =
  getPartnerApplicationsQuerySchema
    .omit({
      sortOrder: true,
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["country", "groupId"]).optional(),
    });
