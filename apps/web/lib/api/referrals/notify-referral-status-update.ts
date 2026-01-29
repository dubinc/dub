import { ReferralStatusBadges } from "@/ui/referrals/referral-status-badges";
import { sendBatchEmail } from "@dub/email";
import { ResendBulkEmailOptions } from "@dub/email/resend/types";
import ReferralStatusUpdate from "@dub/email/templates/referral-status-update";
import { prisma } from "@dub/prisma";
import { PartnerReferral, ReferralStatus } from "@dub/prisma/client";
import { chunk } from "@dub/utils";

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
        users: {
          where: {
            notificationPreferences: {
              referralStatusUpdate: true,
            },
          },
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!program || !partner) return;

  const statusLabel = ReferralStatusBadges[status].label;

  // Try to get an image from the referral's email domain
  const emailDomain = referral.email.split("@")[1];
  const image = emailDomain
    ? `https://logo.clearbit.com/${emailDomain}`
    : null;

  const partnerEmailsToNotify = partner.users
    .map(({ user }) => user.email)
    .filter(Boolean) as string[];

  const allEmails: ResendBulkEmailOptions = partnerEmailsToNotify.map(
    (email) => ({
      subject: `Your referral status has been updated to ${statusLabel}`,
      variant: "notifications",
      to: email,
      react: ReferralStatusUpdate({
        partner: {
          name: partner.name,
          email,
        },
        program: {
          name: program.name,
          slug: program.slug,
        },
        referral: {
          name: referral.name,
          email: referral.email,
          company: referral.company,
          image,
        },
        status: statusLabel,
        notes,
      }),
    }),
  );

  const emailChunks = chunk(allEmails, 100);

  await Promise.all(
    emailChunks.map((emailChunk) => sendBatchEmail(emailChunk)),
  );
}
