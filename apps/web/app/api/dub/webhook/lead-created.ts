import { prisma } from "@/lib/prisma";
import { sendEmail } from "emails";
import NewReferralSignup from "emails/new-referral-signup";

export async function leadCreated(data: any) {
  const referralLink = data.link;

  if (!referralLink) {
    return "Referral link not found in webhook payload";
  }

  if (referralLink.leads > 16) {
    return `Referral limit reached for ${referralLink.id}. Skipping...`;
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
    return "Workspace not found";
  }

  const workspaceOwners = workspace.users.map(({ user }) => user);

  await Promise.all([
    // Update the referrer's workspace usage
    prisma.project.update({
      where: {
        id: workspace.id,
      },

      data: {
        referredSignups: {
          increment: 1,
        },
        usageLimit: {
          increment: 500,
        },
      },
    }),
    workspaceOwners.map(
      (owner) =>
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
