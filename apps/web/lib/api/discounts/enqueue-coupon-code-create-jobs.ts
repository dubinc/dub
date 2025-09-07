import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, isRejected } from "@dub/utils";
import { Link } from "@prisma/client";

const queue = qstash.queue({
  queueName: "coupon-creation",
});

export async function enqueueCouponCodeCreateJobs(
  input: Pick<Link, "id" | "key"> | Pick<Link, "id" | "key">[],
) {
  await queue.upsert({
    parallelism: 10,
  });

  const links = Array.isArray(input) ? input : [input];

  const response = await Promise.allSettled(
    links.map((link) =>
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
    .map((result, index) => ({ result, linkId: links[index].id }))
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
