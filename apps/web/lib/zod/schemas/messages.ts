import { z } from "zod";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";

export const MessageSchema = z
  .object({
    id: z.string(),
    programId: z.string(),
    partnerId: z.string(),
    senderPartnerId: z.string().nullable(),
    senderUserId: z.string().nullable(),

    text: z.string(),

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
});
