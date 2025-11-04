import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  image: z.string().nullable(),
});
