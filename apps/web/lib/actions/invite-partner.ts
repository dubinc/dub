"use server";

import { prisma } from "@dub/prisma";
import { sendEmail } from "emails";
import PartnerInvite from "emails/partner-invite";
import { z } from "zod";
import { getLinkOrThrow } from "../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../api/programs/get-program";
import { createId } from "../api/utils";
import { updateConfig } from "../edge-config";
import { recordLink } from "../tinybird";
import { authActionClient } from "./safe-action";

const invitePartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  email: z.string().trim().email().min(1).max(100),
  linkId: z.string(),
});

export const invitePartnerAction = authActionClient
  .schema(invitePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { email, linkId, programId } = parsedInput;

    const [program, link, tags] = await Promise.all([
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
    ]);

    if (link.programId) {
      throw new Error("Link is already associated with another partner.");
    }

    const [programEnrollment, programInvite] = await Promise.all([
      prisma.programEnrollment.findFirst({
        where: {
          programId,
          partner: {
            users: {
              some: {
                user: {
                  email,
                },
              },
            },
          },
        },
      }),

      prisma.programInvite.findUnique({
        where: {
          email_programId: {
            email,
            programId,
          },
        },
      }),
    ]);

    if (programEnrollment) {
      throw new Error(`Partner ${email} already enrolled in this program.`);
    }

    if (programInvite) {
      throw new Error(`Partner ${email} already invited to this program.`);
    }

    const [result, _] = await Promise.all([
      prisma.programInvite.create({
        data: {
          id: createId({ prefix: "pgi_" }),
          email,
          linkId,
          programId,
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

      // TODO: Remove this once we open up partners.dub.co to everyone
      updateConfig({
        key: "partnersPortal",
        value: email,
      }),
    ]);

    await sendEmail({
      subject: `${program.name} invited you to join Dub Partners`,
      email,
      react: PartnerInvite({
        email,
        appName: `${process.env.NEXT_PUBLIC_APP_NAME}`,
        program: {
          name: program.name,
          logo: program.logo,
        },
      }),
    });

    return result;
  });
