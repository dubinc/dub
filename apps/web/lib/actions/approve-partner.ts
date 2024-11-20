"use server";

import { prisma } from "@/lib/prisma";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../api/programs/get-program";
import { recordLink } from "../tinybird";
import z from "../zod";
import { enrollDotsUserApp } from "./partners/enroll-dots-user-app";
import { authActionClient } from "./safe-action";

const approvePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  linkId: z.string(),
});

// Update a partner enrollment
export const approvePartnerAction = authActionClient
  .schema(approvePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId, linkId } = parsedInput;

    const [program, link, tags, programEnrollment] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
      }),

      prisma.tag.findMany({
        where: {
          links: {
            some: {
              linkId,
            },
          },
        },
      }),

      prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          partner: true,
        },
      }),
    ]);

    if (!programEnrollment) {
      throw new Error("Program enrollment not found.");
    }

    if (programEnrollment.status !== "pending") {
      throw new Error("Program enrollment is not pending.");
    }

    if (link.programId) {
      throw new Error("Link is already associated with another partner.");
    }

    await Promise.allSettled([
      prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: {
          status: "approved",
          linkId: link.id,
        },
      }),

      // update link to have programId
      prisma.link.update({
        where: {
          id: linkId,
        },
        data: {
          programId,
        },
      }),

      // record link update in tinybird
      recordLink({
        domain: link.domain,
        key: link.key,
        link_id: link.id,
        created_at: link.createdAt,
        url: link.url,
        tag_ids: tags.map((t) => t.id) || [],
        program_id: program.id,
        workspace_id: workspace.id,
        deleted: false,
      }),

      // enroll partner in Dots app if it exists
      workspace.dotsAppId &&
        enrollDotsUserApp({
          partner: programEnrollment.partner,
          dotsAppId: workspace.dotsAppId,
          programEnrollmentId: programEnrollment.id,
        }),
    ]);

    // TODO: [partners] Notify partner of approval?

    return {
      ok: true,
    };
  });
