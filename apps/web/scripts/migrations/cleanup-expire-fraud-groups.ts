import { prisma } from "@dub/prisma";
import { subDays } from "date-fns";
import "dotenv-flow/config";

async function main() {
  const expiredFraudGroups = await prisma.fraudEventGroup.findMany({
    where: {
      status: "pending",
      lastEventAt: {
        lt: subDays(new Date(), 30),
      },
    },
  });

  console.log(`Found ${expiredFraudGroups.length} expired fraud events`);

  const { count } = await prisma.fraudEventGroup.updateMany({
    where: {
      id: {
        in: expiredFraudGroups.map((event) => event.id),
      },
      status: "pending",
    },
    data: {
      status: "expired",
    },
  });

  console.info(`Expired ${count} fraud event groups`);
}

main();
