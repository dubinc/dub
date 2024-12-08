import { REFERRAL_SIGNUPS_MAX } from "@/lib/embed/constants";
import { prisma } from "@dub/prisma";
import { LeadCreatedEvent } from "dub/models/components";
import NewReferralSignup from "emails/new-referral-signup";
import { sendEmailViaResend } from "emails/send-via-resend";

export async function leadCreated(data: LeadCreatedEvent["data"]) {
  const { link: referralLink } = data;

  if (!referralLink) {
    return "Referral link not found in webhook payload";
  }

  const workspace = await prisma.project.findUnique({
    where: {
      referralLinkId: referralLink.id,
    },
    include: {
      users: {
        select: {
          user: true,
        },
        where: {
          role: "owner",
        },
      },
    },
  });

  if (!workspace) {
    return `Referral link workspace not found for ${referralLink.shortLink}`;
  }

  await Promise.all([
    prisma.project.update({
      where: {
        id: workspace.id,
      },
      data: {
        referredSignups: {
          increment: 1,
        },
        // If the referral link has less than the max number of signups,
        // update the referrer's workspace usage
        ...(referralLink.leads &&
          referralLink.leads < REFERRAL_SIGNUPS_MAX && {
            usageLimit: {
              increment: 500,
            },
          }),
      },
    }),
    // send notification email to workspace owners
    workspace.users.map(
      ({ user: owner }) =>
        owner.email &&
        sendEmailViaResend({
          email: owner.email,
          subject: "Someone signed up for Dub via your referral link!",
          react: NewReferralSignup({
            email: owner.email,
            workspace,
          }),
        }),
    ),
    // TODO: Send merch link for cap
    // data.link.leads === 10 &&
    //   sendMerchLink(workspace.id),
  ]);

  return `Successfully handled referral signup event for ${workspace.name} (slug: ${workspace.slug})`;
}
