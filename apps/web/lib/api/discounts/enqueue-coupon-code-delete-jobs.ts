import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK, isRejected } from "@dub/utils";
import { Link } from "@prisma/client";

const queue = qstash.queue({
  queueName: "coupon-deletion",
});

export async function enqueueCouponCodeDeleteJobs(
  input:
    | Pick<Link, "id" | "couponCode" | "projectId">
    | Pick<Link, "id" | "couponCode" | "projectId">[],
) {
  await queue.upsert({
    parallelism: 10,
  });

  // Process the links with coupon code only
  const links = Array.isArray(input) ? input : [input];
  const linksWithCouponCode = links.filter((link) => link.couponCode);

  if (linksWithCouponCode.length === 0) {
    return;
  }

  const response = await Promise.allSettled(
    linksWithCouponCode.map((link) =>
      queue.enqueueJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/delete-coupon-code`,
        method: "POST",
        body: {
          linkId: link.id,
          couponCode: link.couponCode,
          workspaceId: link.projectId!,
        },
      }),
    ),
  );

  const rejected = response
    .map((result, index) => ({ result, linkId: linksWithCouponCode[index].id }))
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
