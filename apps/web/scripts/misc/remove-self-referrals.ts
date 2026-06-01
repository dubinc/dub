import { prisma } from "@dub/prisma";
import { ProgramApplicationEvent } from "@dub/prisma/client";
import "dotenv-flow/config";

type Result = Pick<
  ProgramApplicationEvent,
  "id" | "partnerId" | "referredByPartnerId"
>;

// Remove the self referrals from ProgramApplicationEvent
async function main() {
  const programApplicationEvents: Result[] = await prisma.$queryRaw`
    SELECT id, partnerId, referredByPartnerId, visitedAt
    FROM ProgramApplicationEvent
      WHERE partnerId = referredByPartnerId AND partnerId != ''
  `;

  if (programApplicationEvents.length === 0) {
    console.log("No self referrals found, skipping...");
    return;
  }

  console.log(`Found ${programApplicationEvents.length} self referrals.`);

  console.table(programApplicationEvents);

  const { count } = await prisma.programApplicationEvent.updateMany({
    where: {
      id: {
        in: programApplicationEvents.map((event) => event.id),
      },
    },
    data: {
      referredByPartnerId: null,
    },
  });

  console.log(`Updated ${count} self referrals.`);
}

main();
