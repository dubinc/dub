import DubPartnerRewind from "@dub/email/templates/dub-partner-rewind";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

async function main() {
  const partnerRewinds = await prisma.partnerRewind.findMany({
    where: {
      partner: {
        users: {
          some: {
            user: {
              subscribed: true,
            },
          },
        },
      },
      year: 2025,
    },
    include: {
      partner: true,
    },
  });
  console.log(`Found ${partnerRewinds.length} partner rewinds`);

  console.table(
    partnerRewinds
      .map(({ partner, id, year, partnerId, createdAt, sentAt, ...rest }) => ({
        ...rest,
        partner: partner.email,
        country: partner.country,
      }))
      .slice(0, 10),
  );

  const res = await queueBatchEmail<typeof DubPartnerRewind>(
    partnerRewinds.map(({ partner }) => ({
      to: partner.email!,
      subject: "Your Dub Partner Rewind 2025",
      variant: "marketing",
      replyTo: "noreply",
      templateName: "DubPartnerRewind",
      templateProps: {
        email: partner.email!,
      },
    })),
  );

  console.log({ res });
}

main();
