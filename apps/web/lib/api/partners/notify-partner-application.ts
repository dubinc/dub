import { formatApplicationFormData } from "@/lib/partners/format-application-form-data";
import { sendBatchEmail } from "@dub/email";
import { ResendBulkEmailOptions } from "@dub/email/resend/types";
import PartnerApplicationReceived from "@dub/email/templates/partner-application-received";
import { prisma } from "@dub/prisma";
import {
  Partner,
  PartnerGroup,
  Program,
  ProgramApplication,
} from "@dub/prisma/client";
import { chunk } from "@dub/utils";

export async function notifyPartnerApplication({
  partner,
  program,
  group,
  application,
}: {
  partner: Partner;
  program: Program;
  group: Pick<PartnerGroup, "autoApprovePartnersEnabledAt"> | null;
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
  const allEmails: ResendBulkEmailOptions = workspaceUsers.map(
    ({ user, project }) => ({
      subject: `New partner application for ${program.name}`,
      variant: "notifications",
      to: user.email!,
      react: PartnerApplicationReceived({
        email: user.email!,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email!,
          image: partner.image,
          country: partner.country,
          applicationFormData: formatApplicationFormData(application),
        },
        program: {
          name: program.name,
          autoApprovePartners: group?.autoApprovePartnersEnabledAt
            ? true
            : false,
        },
        workspace: {
          slug: project.slug,
        },
      }),
    }),
  );

  const emailChunks = chunk(allEmails, 100);

  // Send all emails in batches
  await Promise.all(
    emailChunks.map((emailChunk) => sendBatchEmail(emailChunk)),
  );
}
