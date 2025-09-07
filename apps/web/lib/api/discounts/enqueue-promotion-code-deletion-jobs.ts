import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, isRejected } from "@dub/utils";
import { Link } from "@prisma/client";

const queue = qstash.queue({
  queueName: "coupon-deletion",
});

type Input =
  | {
      link: Pick<Link, "id" | "couponCode">;
    }
  | {
      links: Pick<Link, "id" | "couponCode">[];
    };

export async function enqueueCouponCodeDeletionJobs(input: Input) {
  await queue.upsert({
    parallelism: 10,
  });

  const finalLinks = "links" in input ? input.links : [input.link];

  const response = await Promise.allSettled(
    finalLinks.map((link) =>
      queue.enqueueJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete-coupon-code`,
        method: "POST",
        body: {
          linkId: link.id,
          couponCode: link.couponCode,
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
          `Failed to enqueue coupon deletion job for link ${linkId}:`,
          promiseResult.reason,
        );
      }
    });
  }
}
