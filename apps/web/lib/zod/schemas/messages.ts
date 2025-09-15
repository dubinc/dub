import { z } from "zod";
import { PartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";

export const MAX_MESSAGE_LENGTH = 2000;

const messageTextSchema = z.string().min(1).max(MAX_MESSAGE_LENGTH);

export const MessageSchema = z.object({
  id: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  senderPartnerId: z.string().nullable(),
  senderUserId: z.string(),
  text: messageTextSchema,
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
  text: messageTextSchema,
  createdAt: z.coerce
    .date()
    .refine(
      (date) =>
        date.getTime() <= Date.now() &&
        date.getTime() >= Date.now() - 1000 * 60,
      {
        message: "Message timestamp must be within the last 60 seconds",
      },
    ),
});

export const ProgramMessagesSchema = z.array(
  z.object({
    program: ProgramSchema.pick({
      id: true,
      slug: true,
      name: true,
      logo: true,
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
  text: messageTextSchema,
  createdAt: z.coerce
    .date()
    .refine(
      (date) =>
        date.getTime() <= Date.now() &&
        date.getTime() >= Date.now() - 1000 * 60,
      {
        message: "Message timestamp must be within the last 60 seconds",
      },
    ),
});
