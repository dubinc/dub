import { getCompanyLogoUrl } from "@/ui/referrals/referral-utils";
import { sendBatchEmail } from "@dub/email";
import PartnerReferralSubmitted from "@dub/email/templates/partner-referral-submitted";
import { prisma } from "@dub/prisma";
import { PartnerReferral } from "@dub/prisma/client";

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
        isMachine: false,
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
    take: 100,
    orderBy: {
      createdAt: "asc",
    },
  });

  // Parse formData from JSON
  const formData = referral.formData as
    | { label: string; value: unknown }[]
    | null;

  const emailsRes = await sendBatchEmail(
    workspaceUsers.map(({ user, project }) => ({
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
    })),
  );

  console.log(`Resend email sent: ${JSON.stringify(emailsRes, null, 2)}`);
}
