import { prisma } from "@/lib/prisma";
import { sendEmail } from "emails";
import NewReferralSale from "emails/new-referral-sale";

export async function saleCreated(data: any) {
  const { link: referralLink } = data.sale;

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

  const workspaceOwners = workspace.users.map(({ user }) => user);

  await Promise.all(
    workspaceOwners.map(
      (owner) =>
        owner.email &&
        sendEmail({
          email: owner.email,
          subject: `Congrats! You just made a $${Math.round(data.sale.amount / 100).toLocaleString()} sale via your Dub referral link!`,
          react: NewReferralSale({
            email: owner.email,
            workspace,
            saleAmount: data.sale.amount,
          }),
        }),
    ),
  );

  return `Successfully handled referral sale event for ${workspace.name} (slug: ${workspace.slug})`;
}
