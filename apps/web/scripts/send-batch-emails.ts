import DubPartnerRewind from "@dub/email/templates/dub-partner-rewind";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

async function main() {
  const partnerRewinds = await prisma.partnerRewind.findMany({
    where: {
      partner: {
        users: {
          some: {
            user: {
              notificationPreferences: {
                partnerAccount: true,
              },
            },
          },
        },
      },
      year: 2025,
      sentAt: null,
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

  const chunks = chunk(partnerRewinds, 1000);
  for (const chunk of chunks) {
    const res = await prisma.partnerRewind.updateMany({
      where: {
        id: {
          in: chunk.map(({ id }) => id),
        },
      },
      data: {
        sentAt: new Date(),
      },
    });
    console.log(`Updated ${res.count} partner rewinds to sent`);
  }
}

main();
