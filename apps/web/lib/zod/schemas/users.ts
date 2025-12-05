import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});
