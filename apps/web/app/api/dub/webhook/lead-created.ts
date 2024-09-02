import { prisma } from "@/lib/prisma";

export async function leadCreated(data: any) {
  const referralLink = data.link;

  if (!referralLink) {
    return "Referral link not found in webhook payload";
  }

  if (referralLink.leads > 16) {
    return `Referral limit reached for ${referralLink.id}. Skipping...`;
  }

  // Update the referrer's workspace
  const workspace = await prisma.project.update({
    where: {
      referralLinkId: referralLink.id,
    },
    data: {
      referredSignups: {
        increment: 1,
      },
      usageLimit: {
        increment: 500,
      },
    },
    include: {
      users: {
        select: {
          user: true,
        },
      },
    },
  });

  if (data.link.leads === 10) {
    // TODO: Send merch link for cap
    // const userEmails = workspace.users.map((user) => user.user.email);
  }

  return `Successfully tracked referral signup for ${workspace.name} (slug: ${workspace.slug})`;
}
