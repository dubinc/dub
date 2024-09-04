import { roles } from "@/lib/types";
import { z } from "zod";

export const inviteTeammatesSchema = z.object({
  teammates: z.array(
    z.object({
      email: z.string().email(),
      role: z.enum(roles),
    }),
  ),
});

export type Invite = z.infer<typeof inviteTeammatesSchema>["teammates"][number];
