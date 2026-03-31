"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { sanitizeMarkdown } from "@/lib/partners/sanitize-markdown";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const saveInviteEmailDataSchema = z.object({
  workspaceId: z.string(),
  subject: z.string().trim().min(1).max(140),
  title: z.string().trim().min(1).max(280),
  body: z.string().trim().min(1).max(3000),
});

export const saveInviteEmailDataAction = authActionClient
  .inputSchema(saveInviteEmailDataSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { subject, title, body } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    // Sanitize emailBody before saving
    const sanitizedBody = sanitizeMarkdown(body);

    if (!sanitizedBody) {
      throw new Error(
        "Email body contains invalid content. Please remove excessively long lines or unsupported characters.",
      );
    }

    await prisma.program.update({
      where: {
        id: programId,
      },
      data: {
        inviteEmailData: {
          subject: subject.trim(),
          title: title.trim(),
          body: sanitizedBody,
        },
      },
    });
  });
