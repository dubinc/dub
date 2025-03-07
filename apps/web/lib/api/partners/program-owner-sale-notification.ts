import { limiter } from "@/lib/cron/limiter";
import { sendEmailViaResend } from "@dub/email/resend";
import { NewSaleAlertProgramOwner } from "@dub/email/templates/new-sale-alert-program-owner";
import { prismaEdge } from "@dub/prisma/edge";

export async function sendProgramOwnerSaleNotification({
  workspace,
  program,
  partner,
  sale,
}: {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  program: {
    id: string;
    name: string;
    logo: string | null;
    holdingPeriodDays: number;
  };
  partner: {
    id: string;
    referralLink: string;
  };
  sale: {
    amount: number;
    earnings: number;
  };
}) {
  const workspaceUsers = await prismaEdge.projectUsers.findMany({
    where: {
      projectId: workspace.id,
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return await Promise.all(
    workspaceUsers.map(({ user }) =>
      limiter.schedule(() =>
        sendEmailViaResend({
          subject: "You just made a sale via Dub Partners!",
          from: "Dub Partners <system@dub.co>",
          email: user.email!,
          react: NewSaleAlertProgramOwner({
            email: user.email!,
            workspace,
            program,
            partner,
            sale,
          }),
        }),
      ),
    ),
  );
}
