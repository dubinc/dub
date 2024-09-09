import { prisma } from "@/lib/prisma";
import { REFERRAL_SIGNUPS_MAX } from "@/lib/referrals/constants";
import { getPrettyUrl } from "@dub/utils";
import { sendEmail } from "emails";
import NewReferralSignup from "emails/new-referral-signup";

export async function leadCreated(data: any) {
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

  if (!user || !workspace) {
    return "User or workspace not found";
  }

  await Promise.all([
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        referredBy: getPrettyUrl(referralLink.shortLink),
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
        ...(referralLink.leads < REFERRAL_SIGNUPS_MAX && {
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

  return `Successfully tracked referral signup for ${workspace.name} (slug: ${workspace.slug})`;
}
