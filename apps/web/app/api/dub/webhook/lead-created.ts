import { prisma } from "@dub/prisma";
import { REFERRAL_SIGNUPS_MAX } from "@/lib/referrals/constants";
import { LeadCreatedEvent } from "dub/models/components";
import { sendEmail } from "emails";
import NewReferralSignup from "emails/new-referral-signup";

export async function leadCreated(data: LeadCreatedEvent["data"]) {
  const { customer: referredUser, link: referralLink } = data;

  if (!referralLink) {
    return "Referral link not found in webhook payload";
  }

  const [user, workspace] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: referredUser.id,
      },
    }),
    prisma.project.findUnique({
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
    }),
  ]);

  if (!user) {
    return "referredUser not found";
  }

  if (!workspace) {
    return `Referral link workspace not found for ${referralLink.shortLink}`;
  }

  await Promise.all([
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        referredByWorkspaceId: workspace.id,
      },
    }),
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
        sendEmail({
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
