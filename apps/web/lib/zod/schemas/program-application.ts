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

// @deprecated Use ProgramApplicationSchema instead. Kept for GET /api/partners/applications and webhook payloads for backward compatibility.
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
    networkStatus: true,
    defaultPayoutMethod: true,
    payoutsEnabledAt: true,
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

// Used by GET /api/program-applications. Omits the legacy flat social fields; use `partner.platforms` instead.
export const ProgramApplicationSchema = PartnerApplicationSchema.extend({
  partner: PartnerApplicationSchema.shape.partner.omit({
    website: true,
    youtube: true,
    twitter: true,
    linkedin: true,
    instagram: true,
    tiktok: true,
  }),
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
    sortOrder: true,
  })
  .extend({
    search: z
      .string()
      .optional()
      .describe(
        "Filter applications by name, email, or company name. Partial matches are supported. An exact partner ID is also matched.",
      ),
    status: z
      .enum(ProgramApplicationStatuses)
      .default(ProgramEnrollmentStatus.pending)
      .describe(
        "Filter applications by status. One of `pending` or `rejected`. Defaults to `pending`.",
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
