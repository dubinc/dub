import { MessageType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { PartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";

export const MAX_MESSAGE_LENGTH = 2000;

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const PROGRAM_OWNER_ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
] as const;

export const PARTNER_ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ATTACHMENT_MIME_TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/svg+xml": "SVG",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
};

export const MessageAttachmentSchema = z.object({
  id: z.string(),
  messageId: z.string(),
  url: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  createdAt: z.date(),
});

export const messageAttachmentInputSchema = z.object({
  url: z.url(),
  name: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
  type: z.string().min(1),
});

export const MessageSchema = z.object({
  id: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  senderPartnerId: z.string().nullable(),
  senderUserId: z.string(),
  text: z.string(),
  subject: z.string().nullable(),
  type: z.enum(MessageType),
  readInApp: z.date().nullable(),
  readInEmail: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  senderPartner: PartnerSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
  senderUser: UserSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
  attachments: z.array(MessageAttachmentSchema).default([]),
});

export const PartnerMessagesSchema = z.array(
  z.object({
    partner: PartnerSchema.pick({
      id: true,
      name: true,
      image: true,
    }),
    messages: z.array(MessageSchema),
  }),
);

export const getPartnerMessagesQuerySchema = z.object({
  partnerId: z.string().optional(),
  messagesLimit: z.coerce.number().min(0).optional(),
  sortBy: z.enum(["createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const countMessagesQuerySchema = z.object({
  unread: z.coerce.boolean().optional(),
});

export const messagePartnerSchema = z.object({
  partnerId: z.string(),
  text: z.string().max(MAX_MESSAGE_LENGTH),
  attachments: z
    .array(messageAttachmentInputSchema)
    .max(MAX_ATTACHMENTS_PER_MESSAGE)
    .default([]),
});

export const ProgramMessagesSchema = z.array(
  z.object({
    program: ProgramSchema.pick({
      id: true,
      slug: true,
      name: true,
      logo: true,
      messagingEnabledAt: true,
    }),
    messages: z.array(MessageSchema),
  }),
);

export const getProgramMessagesQuerySchema = z.object({
  programSlug: z.string().optional(),
  messagesLimit: z.coerce.number().min(0).optional(),
  sortBy: z.enum(["createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const messageProgramSchema = z.object({
  programSlug: z.string(),
  text: z.string().max(MAX_MESSAGE_LENGTH),
  attachments: z
    .array(messageAttachmentInputSchema)
    .max(MAX_ATTACHMENTS_PER_MESSAGE)
    .default([]),
});

export function getAttachmentTypeLabel(mimeType: string): string {
  return (
    ATTACHMENT_MIME_TYPE_LABELS[mimeType] ||
    mimeType.split("/").pop()?.toUpperCase() ||
    "FILE"
  );
}
