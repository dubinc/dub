import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationReceived from "@dub/email/templates/partner-application-received";
import { prisma } from "@dub/prisma";
import { Partner, Program, ProgramApplication } from "@dub/prisma/client";
import { chunk } from "@dub/utils";

export async function notifyPartnerApplication({
  partner,
  program,
  application,
}: {
  partner: Partner;
  program: Program;
  application: ProgramApplication;
}) {
  const workspaceUsers = await prisma.projectUsers.findMany({
    where: {
      projectId: program.workspaceId,
      notificationPreference: {
        newPartnerApplication: true,
      },
      user: {
        email: {
          not: null,
        },
      },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
      project: {
        select: {
          slug: true,
        },
      },
    },
  });

  // Create all emails first, then chunk them into batches of 100
  const allEmails = workspaceUsers.map(({ user, project }) => ({
    subject: `New partner application for ${program.name}`,
    from: VARIANT_TO_FROM_MAP.notifications,
    to: user.email!,
    react: PartnerApplicationReceived({
      email: user.email!,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email!,
        image: partner.image,
        country: partner.country,
        proposal: application.proposal,
        comments: application.comments,
      },
      program: {
        name: program.name,
        autoApprovePartners: program.autoApprovePartnersEnabledAt
          ? true
          : false,
      },
      workspace: {
        slug: project.slug,
      },
    }),
  }));

  const emailChunks = chunk(allEmails, 100);

  // Send all emails in batches
  await Promise.all(
    emailChunks.map((emailChunk) => resend.batch.send(emailChunk)),
  );
}
