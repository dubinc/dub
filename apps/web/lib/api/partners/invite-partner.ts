import { recordLink } from "@/lib/tinybird";
import { ProgramProps, UserProps, WorkspaceProps } from "@/lib/types";
import { sendEmail } from "@dub/email";
import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../audit-logs/record-audit-log";
import { createId } from "../create-id";

export const invitePartner = async ({
  email,
  program,
  link,
  workspace,
  user,
}: {
  email: string;
  program: ProgramProps;
  link: Link;
  workspace: Pick<WorkspaceProps, "id">;
  user: Pick<UserProps, "id" | "name">;
}) => {
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

  const programInvited = await prisma.programInvite.create({
    data: {
      id: createId({ prefix: "pgi_" }),
      email,
      linkId: link.id,
      programId: program.id,
    },
  });

  waitUntil(
    Promise.allSettled([
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
      prisma.link
        .update({
          where: {
            id: link.id,
          },
          data: {
            programId: program.id,
            folderId: program.defaultFolderId,
            trackConversion: true,
          },
        })
        .then((link) => recordLink(link)),

      recordAuditLog({
        action: "partner.invite",
        workspace_id: workspace.id,
        program_id: program.id,
        actor_id: user.id,
        actor_name: user.name,
        targets: [{ id: programInvited.id, type: "partner_invite" }],
        description: `Invited partner ${email} to the program.`,
      }),
    ]),
  );

  return programInvited;
};
