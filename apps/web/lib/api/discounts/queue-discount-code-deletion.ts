import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

const queue = qstash.queue({
  queueName: "discount-code-deletion",
});

export async function queueDiscountCodeDeletionJobs(discountId: string) {
  await queue.upsert({
    parallelism: 10,
  });

  let cursor: undefined | string = undefined;

  while (true) {
    const discountCodes = await prisma.discountCode.findMany({
      where: {
        discountId,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      cursor: {
        id: cursor,
      },
      take: 100,
    });

    if (discountCodes.length === 0) {
      break;
    }

    console.log("discountCodes", discountCodes);

    const response = await Promise.allSettled(
      discountCodes.map(({ id }) =>
        queue.enqueueJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/discounts/delete-discount-code`,
          method: "POST",
          body: {
            discountCodeId: id,
          },
        }),
      ),
    );

    console.log("response", response);

    cursor = discountCodes[discountCodes.length - 1].id;
  }
}
