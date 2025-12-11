import {
  EXCLUDED_PROGRAM_IDS,
  PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
} from "@/lib/constants/partner-profile";
import ProgramMarketplaceAnnouncement from "@dub/email/templates/program-marketplace-announcement";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

async function main() {
  const partners = await prisma.partner.findMany({
    where: {
      email: "steven@dub.co",
      users: {
        some: {},
      },
      programs: {
        some: {
          programId: {
            notIn: EXCLUDED_PROGRAM_IDS,
          },
          status: "approved",
          totalCommissions: {
            gte: PARTNER_NETWORK_MIN_COMMISSIONS_CENTS,
          },
        },
        none: {
          status: "banned",
        },
      },
    },
  });

  const res = await queueBatchEmail<typeof ProgramMarketplaceAnnouncement>(
    partners.map((partner) => ({
      to: partner.email!,
      subject: "Introducing the Dub Program Marketplace",
      variant: "marketing",
      replyTo: "noreply",
      templateName: "ProgramMarketplaceAnnouncement",
      templateProps: {
        email: partner.email!,
      },
    })),
  );

  console.log({ res });
}

main();
