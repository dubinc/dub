import { SubmittedLeadStatus } from "@prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { submittedLeadFormDataSchema } from "./submitted-lead-form";
import { UserSchema } from "./users";
import { centsSchema } from "./utils";

export const submittedLeadSchema = z.object({
  id: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  name: z.string(),
  email: z.email(),
  company: z.string(),
  status: z.enum(SubmittedLeadStatus),
  formData: z.array(submittedLeadFormDataSchema).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
  }),
});

export const getSubmittedLeadsQuerySchema = z
  .object({
    partnerId: z.string().optional(),
    status: z.enum(SubmittedLeadStatus).optional(),
    search: z.string().optional(),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const getSubmittedLeadsCountQuerySchema = getSubmittedLeadsQuerySchema
  .omit({
    page: true,
    pageSize: true,
  })
  .extend({
    groupBy: z.enum(["status", "partnerId"]).optional(),
  });

export const submittedLeadsCountByStatusSchema = z.object({
  status: z.enum(SubmittedLeadStatus),
  _count: z.number(),
});

export const submittedLeadsCountByPartnerSchema = z.object({
  partnerId: z.string(),
  _count: z.number(),
});

export const submittedLeadsCountResponseSchema = z.union([
  z.array(submittedLeadsCountByStatusSchema),
  z.array(submittedLeadsCountByPartnerSchema),
  z.number(),
]);

export const submitLeadSchema = z.object({
  programId: z.string(),
  formData: z.record(z.string(), z.unknown()), // Contains all form fields including name, email, company
});

export const updateSubmittedLeadSchema = z.object({
  leadId: z.string(),
  workspaceId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  company: z.string().min(1, "Company is required"),
  formData: z.array(submittedLeadFormDataSchema).nullable().optional(),
});

const baseSchema = z.object({
  leadId: z.string(),
  workspaceId: z.string(),
  notes: z
    .string()
    .trim()
    .max(1000, "Notes must be less than 1000 characters")
    .optional(),
});

export const updateSubmittedLeadStatusSchema = z.discriminatedUnion("status", [
  baseSchema.extend({
    status: z.literal("pending"),
  }),

  baseSchema.extend({
    status: z.literal("qualified"),
    externalId: z.string().trim().optional(),
  }),

  baseSchema.extend({
    status: z.literal("meeting"),
  }),

  baseSchema.extend({
    status: z.literal("negotiation"),
  }),

  baseSchema.extend({
    status: z.literal("unqualified"),
  }),

  baseSchema.extend({
    status: z.literal("closedWon"),
    saleAmount: centsSchema.pipe(
      z.number().min(0, "Sale amount must be greater than or equal to 0"),
    ),
    stripeCustomerId: z.string().optional(),
  }),

  baseSchema.extend({
    status: z.literal("closedLost"),
  }),
]);

export const MAX_SUBMITTED_LEAD_COMMENT_LENGTH = 2000;

export const SubmittedLeadCommentSchema = z.object({
  id: z.string(),
  leadId: z.string(),
  userId: z.string(),
  partnerId: z.string().nullable(),
  text: z.string(),
  partnerVisible: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  user: UserSchema.pick({
    id: true,
    name: true,
    image: true,
  }),
});

export const createSubmittedLeadCommentSchema = z.object({
  workspaceId: z.string(),
  leadId: z.string(),
  text: z.string().trim().min(1).max(MAX_SUBMITTED_LEAD_COMMENT_LENGTH),
  partnerVisible: z.boolean().default(false),
});

export const updateSubmittedLeadCommentSchema = z.object({
  workspaceId: z.string(),
  commentId: z.string(),
  text: z.string().trim().min(1).max(MAX_SUBMITTED_LEAD_COMMENT_LENGTH),
});

export const deleteSubmittedLeadCommentSchema = z.object({
  workspaceId: z.string(),
  commentId: z.string(),
});

export const createPartnerSubmittedLeadCommentSchema = z.object({
  programId: z.string(),
  leadId: z.string(),
  text: z.string().trim().min(1).max(MAX_SUBMITTED_LEAD_COMMENT_LENGTH),
});
