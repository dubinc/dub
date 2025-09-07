import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import NewCommissionAlertPartner from "@dub/email/templates/new-commission-alert-partner";
import NewSaleAlertProgramOwner from "@dub/email/templates/new-sale-alert-program-owner";
import { prisma } from "@dub/prisma";
import { Commission, Program, Project } from "@dub/prisma/client";
import { chunk } from "@dub/utils";

// Send email to partner and program owners when a commission is created
export async function notifyPartnerCommission({
  program,
  workspace,
  commission,
}: {
  program: Pick<Program, "name" | "slug" | "logo" | "holdingPeriodDays">;
  workspace: Pick<Project, "id" | "slug" | "name">;
  commission: Pick<
    Commission,
    "type" | "amount" | "earnings" | "partnerId" | "linkId"
  >;
}) {
  let [partner, workspaceUsers, partnerLink] = await Promise.all([
    prisma.partner.findUnique({
      where: {
        id: commission.partnerId,
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
    commission.linkId
      ? Promise.resolve(
          prisma.link.findUnique({
            where: {
              id: commission.linkId,
            },
            select: {
              shortLink: true,
            },
          }),
        )
      : Promise.resolve(null),
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
      id: commission.partnerId,
      name: partner.name,
      email: partner.email,
    },
    commission: {
      type: commission.type,
      amount: commission.amount,
      earnings: commission.earnings,
    },
    shortLink: partnerLink?.shortLink ?? null,
  };

  const partnerEmailsToNotify = partner.users
    .map(({ user }) => user.email)
    .filter(Boolean) as string[];

  // Create all emails first, then chunk them into batches of 100
  const allEmails = [
    // Partner emails (for all commission types)
    ...partnerEmailsToNotify.map((email) => ({
      subject: "You just made a commission via Dub Partners!",
      from: VARIANT_TO_FROM_MAP.notifications,
      to: email,
      react: NewCommissionAlertPartner({
        email,
        ...data,
      }),
    })),
    // Workspace owner emails (only for sale commissions)
    ...(commission.type === "sale"
      ? workspaceUsers.map(({ user }) => ({
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
        }))
      : []),
  ];

  const emailChunks = chunk(allEmails, 100);

  // Send all emails in batches
  await Promise.all(
    emailChunks.map((emailChunk) => resend.batch.send(emailChunk)),
  );
}
