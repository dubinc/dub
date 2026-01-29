import { getCompanyLogoUrl } from "@/ui/referrals/referral-utils";
import { sendBatchEmail } from "@dub/email";
import { ResendBulkEmailOptions } from "@dub/email/resend/types";
import PartnerReferralSubmitted from "@dub/email/templates/partner-referral-submitted";
import { prisma } from "@dub/prisma";
import { PartnerReferral } from "@dub/prisma/client";
import { chunk } from "@dub/utils";

export async function notifyPartnerReferralSubmitted({
  referral,
  programId,
}: {
  referral: Pick<
    PartnerReferral,
    "id" | "name" | "email" | "company" | "formData"
  >;
  programId: string;
}) {
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { workspaceId: true },
  });

  if (!program) return;

  const workspaceUsers = await prisma.projectUsers.findMany({
    where: {
      projectId: program.workspaceId,
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

  // Parse formData from JSON
  const formData = referral.formData as
    | { label: string; value: unknown }[]
    | null;

  const allEmails: ResendBulkEmailOptions = workspaceUsers.map(
    ({ user, project }) => ({
      subject: "New partner referral submitted",
      variant: "notifications",
      to: user.email!,
      react: PartnerReferralSubmitted({
        email: user.email!,
        workspace: {
          slug: project.slug,
        },
        referral: {
          id: referral.id,
          name: referral.name,
          email: referral.email,
          company: referral.company,
          image: getCompanyLogoUrl(referral.email),
          formData,
        },
      }),
    }),
  );

  const emailChunks = chunk(allEmails, 100);

  await Promise.all(
    emailChunks.map((emailChunk) => sendBatchEmail(emailChunk)),
  );
}
