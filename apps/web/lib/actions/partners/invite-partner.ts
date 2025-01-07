"use server";

import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { invitePartner } from "@/lib/api/partners/invite-partner";
import { z } from "zod";
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const invitePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().min(1).max(100).optional(),
  linkId: z.string(),
});

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { name, email, linkId, programId } = parsedInput;

    if (!email && !name) {
      throw new Error("Either name or email must be provided");
    }

    const [program, link] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),
      getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
      }),
    ]);

    if (link.programId) {
      throw new Error("Link is already associated with another partner.");
    }

    if (email) {
      return await invitePartner({
        email,
        program,
        link,
      });
    } else if (name) {
      return await enrollPartner({
        programId,
        linkId,
        name,
        email: "test@stripe.com", // TODO: fix this
      });
    }
    throw new Error("Either email or name must be provided");
  });
