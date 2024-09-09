import { prisma } from "@/lib/prisma";
import { sendEmail } from "emails";
import NewReferralSale from "emails/new-referral-sale";

export async function saleCreated(data: any) {
  const referralLink = data.link;

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
    return "Workspace not found";
  }

  const workspaceOwners = workspace.users.map(({ user }) => user);

  await Promise.all(
    workspaceOwners.map(
      (owner) =>
        owner.email &&
        sendEmail({
          email: owner.email,
          subject: `Congrats! You just made a $${(data.sale.amount / 100).toFixed(2)} sale via your Dub referral link!`,
          react: NewReferralSale({
            email: owner.email,
            workspace,
            saleAmount: data.sale.amount,
          }),
        }),
    ),
  );

  return `Successfully tracked referral sale for ${workspace.name} (slug: ${workspace.slug})`;
}
