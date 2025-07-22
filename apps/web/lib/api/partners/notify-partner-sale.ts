import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import NewSaleAlertPartner from "@dub/email/templates/new-sale-alert-partner";
import NewSaleAlertProgramOwner from "@dub/email/templates/new-sale-alert-program-owner";
import { prisma } from "@dub/prisma";
import { Commission, Link } from "@dub/prisma/client";
import { chunk } from "@dub/utils";

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
        users: {
          where: {
            notificationPreferences: {
              commissionCreated: true,
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

  const partnerEmailsToNotify = partner.users
    .map(({ user }) => user.email)
    .filter(Boolean) as string[];

  // Create all emails first, then chunk them into batches of 100
  const allEmails = [
    // Partner emails
    ...partnerEmailsToNotify.map((email) => ({
      subject: "You just made a sale via Dub Partners!",
      from: VARIANT_TO_FROM_MAP.notifications,
      to: email,
      react: NewSaleAlertPartner({
        email,
        ...data,
      }),
    })),
    // Workspace owner emails
    ...workspaceUsers.map(({ user }) => ({
      subject: `New commission for ${partner.name}`,
      from: VARIANT_TO_FROM_MAP.notifications,
      to: user.email!,
      react: NewSaleAlertProgramOwner({
        ...data,
        user: {
          name: user.name,
          email: user.email!,
        },
        workspace,
      }),
    })),
  ];

  const emailChunks = chunk(allEmails, 100);

  // Send all emails in batches
  await Promise.all(
    emailChunks.map((emailChunk) => resend?.batch.send(emailChunk)),
  );
}
