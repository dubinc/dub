"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../api/programs/get-program";
import { createProgramSchema } from "../zod/schemas/programs";
import { authActionClient } from "./safe-action";

const schema = createProgramSchema.partial().extend({
  workspaceId: z.string(),
  programId: z.string(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().min(1).max(100),
  linkId: z.string().trim(),
});

export const invitePartnerAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { name, email, linkId, programId } = parsedInput;

    await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getLinkOrThrow({
        workspace,
        linkId,
      }),
    ]);

    const programInvite = await prisma.programInvite.findUnique({
      where: {
        email_programId: {
          email,
          programId,
        },
      },
    });

    if (programInvite) {
      throw new Error(`Partner ${email} already invited to this program.`);
    }

    const result = await prisma.programInvite.create({
      data: {
        name,
        email,
        linkId,
        programId,
      },
    });

    return result;

    // TODO
    // Send email
  });
