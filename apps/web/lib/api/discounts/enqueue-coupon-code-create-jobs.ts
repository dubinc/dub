import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, isRejected } from "@dub/utils";
import { Link } from "@prisma/client";

const queue = qstash.queue({
  queueName: "coupon-creation",
});

type Input =
  | {
      link: Pick<Link, "id" | "key">;
    }
  | {
      links: Pick<Link, "id" | "key">[];
    };

export async function enqueueCouponCodeCreateJobs(input: Input) {
  await queue.upsert({
    parallelism: 10,
  });

  const finalLinks = "links" in input ? input.links : [input.link];

  const response = await Promise.allSettled(
    finalLinks.map((link) =>
      queue.enqueueJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/create-coupon-code`,
        method: "POST",
        body: {
          linkId: link.id,
          code: link.key,
        },
      }),
    ),
  );

  const rejected = response
    .map((result, index) => ({ result, linkId: finalLinks[index].id }))
    .filter(({ result }) => isRejected(result));

  if (rejected.length > 0) {
    rejected.forEach(({ result: promiseResult, linkId }) => {
      if (isRejected(promiseResult)) {
        console.error(
          `Failed to enqueue coupon creation job for link ${linkId}:`,
          promiseResult.reason,
        );
      }
    });
  }
}
