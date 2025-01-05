"use server";

import { createId } from "@/lib/api/utils";
import { updateConfig } from "@/lib/edge-config";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import PartnerInvite from "emails/partner-invite";
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
      const [programEnrollment, programInvite] = await Promise.all([
        prisma.programEnrollment.findFirst({
          where: {
            programId: program.id,
            partner: {
              email,
            },
          },
        }),
        prisma.programInvite.findUnique({
          where: {
            email_programId: {
              email,
              programId: program.id,
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

      waitUntil(
        Promise.all([
          prisma.programInvite.create({
            data: {
              id: createId({ prefix: "pgi_" }),
              email,
              linkId: link.id,
              programId: program.id,
            },
          }),
          // TODO: Remove this once we open up partners.dub.co to everyone
          updateConfig({
            key: "partnersPortal",
            value: email,
          }).then(() =>
            sendEmail({
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
            }),
          ),
          updateLink({ link, program, workspace }),
        ]),
      );
    } else if (name) {
      const partner = await prisma.partner.create({
        data: {
          id: createId({ prefix: "pn_" }),
          name,
          email: "test@stripe.com", // TODO: fix this
          programs: {
            create: {
              programId: program.id,
              linkId: link.id,
              commissionAmount: 0,
            },
          },
        },
      });
      console.log("partner created", partner);
      waitUntil(updateLink({ link, program, workspace }));
    }
    return { done: true };
  });

const updateLink = async ({ link, program, workspace }) => {
  const tags = await prisma.tag.findMany({
    where: {
      links: {
        some: {
          linkId: link.id,
        },
      },
    },
  });

  await Promise.all([
    // update link to have programId
    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        programId: program.id,
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
  ]);
};
