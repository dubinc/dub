import { limiter } from "@/lib/cron/limiter";
import { sendEmail } from "@dub/email";
import { PartnerApplicationReceived } from "@dub/email/templates/partner-application-received";
import { prisma } from "@dub/prisma";
import { Partner, Program, ProgramApplication } from "@dub/prisma/client";

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
    },
  });

  await Promise.all(
    workspaceUsers.map(({ user }) =>
      limiter.schedule(() =>
        sendEmail({
          subject: `New partner application for ${program.name}`,
          email: user.email!,
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
              id: program.id,
              name: program.name,
            },
          }),
        }),
      ),
    ),
  );
}
