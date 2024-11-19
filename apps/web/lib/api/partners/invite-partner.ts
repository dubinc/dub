import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import { ProgramProps } from "@/lib/types";
import { Link, Project } from "@prisma/client";
import { sendEmail } from "emails";
import PartnerInvite from "emails/partner-invite";
import { createId } from "../utils";

export const invitePartner = async ({
  email,
  program,
  workspace,
  link,
}: {
  email: string;
  program: ProgramProps;
  workspace: Project;
  link: Link;
}) => {
  const [programEnrollment, programInvite] = await Promise.all([
    prisma.programEnrollment.findFirst({
      where: {
        programId: program.id,
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

  const tags = await prisma.tag.findMany({
    where: {
      links: {
        some: {
          linkId: link.id,
        },
      },
    },
  });

  const [programInvited] = await Promise.all([
    prisma.programInvite.create({
      data: {
        id: createId({ prefix: "pgi_" }),
        email,
        linkId: link.id,
        programId: program.id,
      },
    }),

    prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        programId: program.id,
      },
    }),

    updateConfig({
      key: "partnersPortal",
      value: email,
    }),

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
  ]);

  return programInvited;
};
