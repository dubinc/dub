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
  action: z.enum(["invite", "enroll"]),
  name: z.string().trim().min(1).max(100).nullish(),
  email: z.string().trim().email().min(1).max(100).nullish(),
  linkId: z.string(),
});

export const addPartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, action, name, email, linkId } = parsedInput;

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

    // Invite a partner
    if (action === "invite") {
      if (!email) {
        throw new Error("Email is required to invite a partner.");
      }

      return await invitePartner({
        email,
        program,
        link,
      });
    }

    // Enroll a partner
    else if (action === "enroll") {
      if (!name) {
        throw new Error("Name is required to enroll a partner.");
      }

      return await enrollPartner({
        programId,
        linkId,
        partner: {
          name,
          email,
        },
      });
    }
  });
