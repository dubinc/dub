import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// one time script to make sure notificationEmail entries are unique by emailId
async function main() {
  const emails = await prisma.notificationEmail.groupBy({
    by: ["emailId"],
    _count: {
      emailId: true,
    },
    orderBy: {
      _count: {
        emailId: "desc",
      },
    },
  });

  const emailsWithDuplicates = emails.filter(
    (email) => email._count.emailId > 1,
  );

  if (emailsWithDuplicates.length === 0) {
    console.log("No more duplicate emails found");
    return;
  }

  console.log(`Found ${emailsWithDuplicates.length} emails with duplicates`);

  const emailIdsToDelete: string[] = [];
  const notificationEmailIdsToPreserve: string[] = [];

  for (const e of emailsWithDuplicates.slice(0, 100)) {
    const finalEmail = await prisma.notificationEmail.findFirst({
      where: {
        emailId: e.emailId,
      },
      orderBy: {
        id: "desc",
      },
    });
    if (!finalEmail) {
      console.log(`No final email found for ${e.emailId}`);
      continue;
    }
    emailIdsToDelete.push(e.emailId);
    notificationEmailIdsToPreserve.push(finalEmail.id);
  }

  console.log({
    emailIdsToDelete,
    notificationEmailIdsToPreserve,
  });

  const res = await prisma.notificationEmail.deleteMany({
    where: {
      emailId: {
        in: emailIdsToDelete,
      },
      id: {
        notIn: notificationEmailIdsToPreserve,
      },
    },
  });
  console.log(`Deleted ${res.count} notification emails`);
}

main();
