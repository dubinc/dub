import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// one time script to make sure notificationEmail entries are unique by emailId
async function main() {
  const notificationEmailsToBackfill = await prisma.notificationEmail.groupBy({
    by: ["messageId"],
    where: {
      programId: null,
      partnerId: null,
    },
    _count: {
      messageId: true,
    },
    orderBy: {
      _count: {
        messageId: "desc",
      },
    },
    take: 50,
  });

  console.table(notificationEmailsToBackfill);

  for (const notificationEmail of notificationEmailsToBackfill) {
    if (!notificationEmail.messageId) {
      console.log(
        `No messageId found for notification email ${notificationEmail.messageId}`,
      );
      continue;
    }
    const message = await prisma.message.findUnique({
      where: { id: notificationEmail.messageId },
    });
    if (!message) {
      console.log(`Message ${notificationEmail.messageId} not found`);
      continue;
    }
    const res = await prisma.notificationEmail.updateMany({
      where: { messageId: notificationEmail.messageId },
      data: {
        programId: message.programId,
        partnerId: message.partnerId,
      },
    });
    console.log(
      `Updated ${res.count} notification emails with programId ${message.programId} and partnerId ${message.partnerId}`,
    );
  }
}

main();
