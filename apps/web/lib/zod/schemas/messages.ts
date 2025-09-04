import { z } from "zod";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";

export const MAX_MESSAGE_LENGTH = 2000;

export const MessageSchema = z
  .object({
    id: z.string(),
    programId: z.string(),
    partnerId: z.string(),
    senderPartnerId: z.string().nullable(),
    senderUserId: z.string().nullable(),

    text: z.string().min(1).max(MAX_MESSAGE_LENGTH),

    emailId: z.string().nullable(),
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
  })
  .refine((data) => data.senderPartnerId || data.senderUserId, {
    message: "Either senderPartnerId or senderUserId must be present",
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

export const messagePartnerSchema = z.object({
  partnerId: z.string(),
  text: z.string(),
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

export const updatePartnerMessageSchema = z.object({
  messageId: z.string(),
  readInApp: z.boolean().optional(),
  readInEmail: z.boolean().optional(),
});
