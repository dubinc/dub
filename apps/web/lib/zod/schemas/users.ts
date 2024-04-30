import z from "@/lib/zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean().nullable(),
  image: z.string().nullable(),
  subscribed: z.boolean().nullable(),
  source: z.string().nullable(),
  createdAt: z.string(),
});
