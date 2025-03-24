import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { ExpandedLink } from "./utils";

// Schedules a job to complete a link's AB test
export async function scheduleABTestCompletion(
  link: Pick<ExpandedLink, "id" | "testVariants" | "testCompletedAt">,
) {
  await cancelScheduledABTestCompletion(link.id);

  if (!link.testVariants || !link.testCompletedAt) {
    return;
  }

  const url = `${APP_DOMAIN_WITH_NGROK}/api/cron/links/${link.id}/complete-tests`;
  const testCompletedAt = new Date(link.testCompletedAt);

  // Tests are not complete yet, schedule a job for completion
  if (testCompletedAt > new Date()) {
    await qstash.publishJSON({
      url,
      delay: (testCompletedAt.getTime() - new Date().getTime()) / 1000,
      deduplicationId: link.id,
    });
  }
}

// Cancels a scheduled AB test completion for a link (Eg: if the link is updated or deleted)
export async function cancelScheduledABTestCompletion(linkId: string) {
  const url = `${APP_DOMAIN_WITH_NGROK}/api/cron/links/${linkId}/complete-tests`;

  const response = await fetch("https://qstash.upstash.io/v2/messages", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
    }),
  });

  if (!response.ok) {
    console.error(
      `Failed to cancel scheduled AB test completion for link ${linkId}`,
      {
        status: response.status,
        statusText: response.statusText,
      },
    );
  }
}
