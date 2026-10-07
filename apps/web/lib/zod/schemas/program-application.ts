import {
  ProgramApplicationRejectionReason,
  ProgramApplicationStatus,
} from "@prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import {
  EnrolledPartnerSchema,
  exportApplicationsColumnsDefault,
  getPartnersQuerySchema,
  MAX_FRAUD_REASON_LENGTH,
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

// @deprecated Use programApplicationWebhookSchema instead. Kept for backward compatibility.
export const partnerApplicationWebhookSchema = PartnerApplicationSchema;
export const programApplicationWebhookSchema = ProgramApplicationSchema;

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

export const exportApplicationsQuerySchema = getProgramApplicationsQuerySchema
  .pick({
    status: true,
    groupId: true,
    country: true,
    sortOrder: true,
  })
  .extend({
    columns: z
      .string()
      .default(exportApplicationsColumnsDefault.join(","))
      .transform((v) => v?.split(",")),
  });

export const approveProgramApplicationSchema = z.object({
  partnerId: z.string().describe("The ID of the partner to approve."),
  applicationId: z
    .string()
    .optional()
    .describe(
      "The ID of the application to approve. If not provided, the partner's most recent pending or rejected application is used. For a partner who is already approved in the program, only a pending application is used.",
    ),
  groupId: z
    .string()
    .nullish()
    .describe(
      "The ID of the group to assign the partner to. If not provided, the partner will be assigned to the group they applied to, or the program's default group if no application group is set.",
    ),
  tagIds: z
    .array(z.string())
    .max(100)
    .optional()
    .describe(
      "The IDs of the partner tags to assign as part of approval. Existing tags are kept. Takes priority over `tagNames` only when it contains at least one ID.",
    ),
  tagNames: z
    .array(z.string())
    .max(100)
    .optional()
    .describe(
      "The names of the partner tags to assign as part of approval. Existing tags are kept. Ignored only when `tagIds` contains at least one ID.",
    ),
});

export const bulkApproveProgramApplicationsSchema = z.object({
  workspaceId: z.string(),
  groupId: z.string().nullish().default(null),
  applicationIds: z
    .array(z.string())
    .max(100)
    .min(1)
    .transform((v) => [...new Set(v)]),
});

export const bulkRejectProgramApplicationsSchema = z.object({
  workspaceId: z.string(),
  partnerIds: z
    .array(z.string())
    .max(100)
    .min(1)
    .transform((v) => [...new Set(v)]),
});

// Max length for optional `rejectionNote` on `ProgramApplication`
export const PROGRAM_APPLICATION_REJECTION_NOTE_MAX_LENGTH = 500;

export const rejectProgramApplicationSchema = z.object({
  partnerId: z.string().describe("The ID of the partner to reject."),
  rejectionReason: z
    .enum(ProgramApplicationRejectionReason)
    .optional()
    .describe(
      "The reason for rejecting the partner application. This will be shared with the partner via email.",
    ),
  rejectionNote: z
    .string()
    .max(PROGRAM_APPLICATION_REJECTION_NOTE_MAX_LENGTH)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t === "" ? undefined : t;
    })
    .describe(
      "Additional details about the rejection. This will be shared with the partner via email.",
    ),
  reapplicationTimeframe: z
    .enum(["instant", "standard", "never"])
    .default("standard")
    .describe(
      "The mode for reapplying for the program. `instant`: The partner can reapply immediately. `standard`: The partner can reapply after 30 days. `never`: The partner can never reapply for the program. Defaults to `standard` if undefined.",
    ),
  flagForFraud: z
    .boolean()
    .optional()
    .describe(
      "Whether to flag the partner for fraud review by the Dub team. Cannot be combined with `reapplicationTimeframe: instant`.",
    ),
  flagForFraudReason: z
    .string()
    .max(MAX_FRAUD_REASON_LENGTH)
    .optional()
    .transform((s) => {
      const t = s?.trim();
      return t === "" ? undefined : t;
    })
    .describe(
      "The reason for flagging the partner for fraud. Required when flagForFraud is true.",
    ),
});
