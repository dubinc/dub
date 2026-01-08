import { WorkspaceRole } from "@dub/prisma/client";
import * as z from "zod/v4";

export const inviteTeammatesSchema = z.object({
  teammates: z.array(
    z.object({
      email: z.email(),
      role: z.enum(WorkspaceRole),
    }),
  ),
});

export type Invite = z.infer<typeof inviteTeammatesSchema>["teammates"][number];
