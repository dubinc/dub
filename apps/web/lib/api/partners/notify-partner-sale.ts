import { limiter } from "@/lib/cron/limiter";
import { sendEmail } from "@dub/email";
import NewSaleAlertPartner from "@dub/email/templates/new-sale-alert-partner";
import NewSaleAlertProgramOwner from "@dub/email/templates/new-sale-alert-program-owner";
import { prisma } from "@dub/prisma";
import { Commission, Link } from "@dub/prisma/client";

// Send email to partner and program owners when a sale is made
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
      slug: true,
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

  let [partner, workspaceUsers] = await Promise.all([
    prisma.partner.findUnique({
      where: {
        id: link.partnerId,
      },
      select: {
        name: true,
        email: true,
      },
    }),
    prisma.projectUsers.findMany({
      where: {
        projectId: workspace.id,
        notificationPreference: {
          newPartnerSale: true,
        },
        user: {
          email: {
            not: null,
          },
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

  if (!partner) {
    return;
  }

  const data = {
    program: {
      id: program.id,
      name: program.name,
      slug: program.slug,
      logo: program.logo,
      holdingPeriodDays: program.holdingPeriodDays,
    },
    partner: {
      id: link.partnerId,
      referralLink: link.shortLink,
      name: partner.name,
      email: partner.email,
    },
    sale: {
      amount: commission.amount,
      earnings: commission.earnings,
    },
  };

  await Promise.all([
    ...(partner.email
      ? [
          sendEmail({
            subject: "You just made a sale via Dub Partners!",
            from: "Dub Partners <system@dub.co>",
            email: partner.email!,
            react: NewSaleAlertPartner({
              email: partner.email!,
              ...data,
            }),
          }),
        ]
      : []),
    ...workspaceUsers.map(({ user }) =>
      limiter.schedule(() =>
        sendEmail({
          subject: `New commission for ${partner.name}`,
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
