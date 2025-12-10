import { WorkspaceRole } from "@dub/prisma/client";
import { z } from "zod";

export const inviteTeammatesSchema = z.object({
  teammates: z.array(
    z.object({
      email: z.string().email(),
      role: z.nativeEnum(WorkspaceRole),
    }),
  ),
});

export type Invite = z.infer<typeof inviteTeammatesSchema>["teammates"][number];
