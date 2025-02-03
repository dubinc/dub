import { updateConfig } from "@/lib/edge-config";
import { ProgramProps } from "@/lib/types";
import { sendEmail } from "@dub/email";
import { PartnerInvite } from "@dub/email/templates/partner-invite";
import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { waitUntil } from "@vercel/functions";
import { createId } from "../utils";

export const invitePartner = async ({
  email,
  program,
  link,
}: {
  email: string;
  program: ProgramProps;
  link: Link;
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

  const [programInvited] = await Promise.all([
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
    }),
  ]);

  waitUntil(
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
  );

  return programInvited;
};
