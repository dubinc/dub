import { prisma } from "@dub/prisma";
import { addSeconds, subSeconds } from "date-fns";
import "dotenv-flow/config";

// one time script to make sure notificationEmail entries are unique by emailId
async function main() {
  const notificationEmailsToBackfill = await prisma.notificationEmail.findMany({
    where: {
      type: "Campaign",
      deliveredAt: null,
    },
    take: 1000,
  });

  for (const notificationEmail of notificationEmailsToBackfill) {
    // Calculate base deliveredAt (5-15 seconds after createdAt)
    const baseDeliveredAt = addSeconds(
      notificationEmail.createdAt,
      5 + Math.random() * 10,
    );

    // If openedAt exists, ensure deliveredAt is at least 1 second before openedAt
    let deliveredAt = baseDeliveredAt;
    if (notificationEmail.openedAt) {
      const maxDeliveredAt = subSeconds(notificationEmail.openedAt, 1);
      if (baseDeliveredAt > maxDeliveredAt) {
        deliveredAt = maxDeliveredAt;
      }
    }

    await prisma.notificationEmail.update({
      where: { id: notificationEmail.id },
      data: { deliveredAt },
    });
    console.log(
      `Backfilled ${notificationEmail.id} with deliveredAt: ${deliveredAt.toISOString()}`,
    );
  }
}

main().catch(console.error);
