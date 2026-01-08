import { MessageType } from "@dub/prisma/client";
import * as z from "zod/v4";
import { PartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";

export const MAX_MESSAGE_LENGTH = 2000;

const messageTextSchema = z.string().min(1);

export const MessageSchema = z.object({
  id: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  senderPartnerId: z.string().nullable(),
  senderUserId: z.string(),
  text: messageTextSchema,
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
  text: messageTextSchema.max(MAX_MESSAGE_LENGTH),
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
  text: messageTextSchema.max(MAX_MESSAGE_LENGTH),
});
