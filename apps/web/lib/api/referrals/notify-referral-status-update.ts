import { ReferralStatusBadges } from "@/ui/referrals/referral-status-badges";
import { getCompanyLogoUrl } from "@/ui/referrals/referral-utils";
import { sendEmail } from "@dub/email";
import ReferralStatusUpdate from "@dub/email/templates/referral-status-update";
import { prisma } from "@dub/prisma";
import { PartnerReferral, ReferralStatus } from "@dub/prisma/client";

export async function notifyReferralStatusUpdate({
  referral,
  programId,
  status,
  notes,
}: {
  referral: Pick<PartnerReferral, "name" | "email" | "company" | "partnerId">;
  programId: string;
  status: ReferralStatus;
  notes?: string | null;
}) {
  const [program, partner] = await Promise.all([
    prisma.program.findUnique({
      where: { id: programId },
      select: { name: true, slug: true },
    }),

    prisma.partner.findUnique({
      where: { id: referral.partnerId },
      select: {
        name: true,
        email: true,
      },
    }),
  ]);

  if (!program || !partner) return;

  const statusLabel = ReferralStatusBadges[status].label;

  const emailRes = await sendEmail({
    subject: `Your referral status has been updated to ${statusLabel}`,
    variant: "notifications",
    to: partner.email!,
    react: ReferralStatusUpdate({
      partner: {
        name: partner.name,
        email: partner.email!,
      },
      program: {
        name: program.name,
        slug: program.slug,
      },
      referral: {
        name: referral.name,
        email: referral.email,
        company: referral.company,
        image: getCompanyLogoUrl(referral.email),
      },
      status: statusLabel,
      notes,
    }),
  });

  console.log(`Resend email sent: ${JSON.stringify(emailRes, null, 2)}`);
}
