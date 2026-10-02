import { ProgramApplicationStatus } from "@prisma/client";
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
  })
    .extend(
      ProgramEnrollmentSchema.pick({
        groupId: true,
        status: true,
      }).shape,
    )
    .extend(OldPartnerPlatformsFields.shape),
  applicationFormData: z
    .array(
      z.object({
        label: z.string(),
        value: z.string().nullable(),
      }),
    )
    .nullable(),
});

// Used by GET /api/program-applications. Additive over PartnerApplicationSchema; the flat social fields are kept for backward compatibility.
export const ProgramApplicationSchema = PartnerApplicationSchema.extend({
  partner: PartnerApplicationSchema.shape.partner
    .extend(
      EnrolledPartnerSchema.pick({
        networkStatus: true,
        defaultPayoutMethod: true,
        payoutsEnabledAt: true,
      }).shape,
    )
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
});

export const partnerApplicationWebhookSchema = PartnerApplicationSchema;

export const getProgramApplicationsQuerySchema = getPartnersQuerySchema
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
      .enum(ProgramApplicationStatus)
      .default(ProgramApplicationStatus.pending)
      .describe(
        "Filter applications by status. One of `pending`, `approved`, or `rejected`. Defaults to `pending`.",
      ),
    ...getPaginationQuerySchema({
      pageSize: PARTNERS_MAX_PAGE_SIZE,
    }),
  });

export const getProgramApplicationsCountQuerySchema =
  getProgramApplicationsQuerySchema
    .omit({
      sortOrder: true,
      page: true,
      pageSize: true,
    })
    .extend({
      groupBy: z.enum(["country", "groupId"]).optional(),
    });
