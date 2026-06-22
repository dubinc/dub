"use server";

import { DubApiError } from "@/lib/api/errors";
import { partnerReachableByProgramWhereInput } from "@/lib/api/partners/partner-reachable-by-program-where-input";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@/lib/prisma";
import {
  PartnerCommentSchema,
  createPartnerCommentSchema,
} from "../../zod/schemas/programs";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

// Create a partner comment
export const createPartnerCommentAction = authActionClient
  .inputSchema(createPartnerCommentSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    // Allow commenting on partners that are enrolled in the program OR
    // discoverable via the partner network, so the team can discuss a partner
    // (e.g. whether to invite them) before they're enrolled.
    const partner = await prisma.partner.findFirst({
      where: {
        id: partnerId,
        ...partnerReachableByProgramWhereInput(programId),
      },
      select: { id: true },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    const comment = await prisma.partnerComment.create({
      data: {
        programId,
        partnerId,
        userId: user.id,
        text,
      },
      include: {
        user: true,
      },
    });

    return {
      comment: PartnerCommentSchema.parse(comment),
    };
  });
