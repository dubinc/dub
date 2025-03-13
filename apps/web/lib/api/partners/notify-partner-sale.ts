import { limiter } from "@/lib/cron/limiter";
import { sendEmail } from "@dub/email";
import NewSaleAlertPartner from "@dub/email/templates/new-sale-alert-partner";
import NewSaleAlertProgramOwner from "@dub/email/templates/new-sale-alert-program-owner";
import { prisma } from "@dub/prisma";
import { Commission, Link } from "@dub/prisma/client";

// Send email to partners and program owners when a sale is made
export async function notifyPartnerSale({
  link,
  commission,
}: {
  link: Pick<Link, "partnerId" | "shortLink" | "programId">;
  commission: Pick<Commission, "amount" | "earnings">;
}) {
  if (!link.programId || !link.partnerId) {
    return;
  }

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: link.programId,
    },
    select: {
      id: true,
      name: true,
      logo: true,
      holdingPeriodDays: true,
      workspace: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  const workspace = program.workspace;

  let [partnerUsers, workspaceUsers] = await Promise.all([
    prisma.partnerUser.findMany({
      where: {
        partnerId: link.partnerId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),

    prisma.projectUsers.findMany({
      where: {
        projectId: workspace.id,
        notificationPreference: {
          newPartnerSale: true,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const partner = partnerUsers.find(
    ({ partner }) => partner.id === link.partnerId,
  );

  if (!partner) {
    return;
  }

  const { partner: partnerProfile } = partner;

  const data = {
    program: {
      id: program.id,
      name: program.name,
      logo: program.logo,
      holdingPeriodDays: program.holdingPeriodDays,
    },
    partner: {
      id: link.partnerId,
      referralLink: link.shortLink,
      name: partnerProfile.name,
      email: partnerProfile.email,
    },
    sale: {
      amount: commission.amount,
      earnings: commission.earnings,
    },
  };

  await Promise.all([
    ...partnerUsers.map(({ user }) =>
      limiter.schedule(() =>
        sendEmail({
          subject: "You just made a sale via Dub Partners!",
          from: "Dub Partners <system@dub.co>",
          email: user.email!,
          react: NewSaleAlertPartner({
            email: user.email!,
            ...data,
          }),
        }),
      ),
    ),

    ...workspaceUsers.map(({ user }) =>
      limiter.schedule(() =>
        sendEmail({
          subject: `New commission for ${partnerProfile.name}`,
          from: "Dub Partners <system@dub.co>",
          email: user.email!,
          react: NewSaleAlertProgramOwner({
            ...data,
            user: {
              name: user.name,
              email: user.email!,
            },
            workspace,
          }),
        }),
      ),
    ),
  ]);
}
