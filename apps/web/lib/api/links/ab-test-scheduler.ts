import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { ExpandedLink } from "./utils";

// Schedules a job to complete a link's AB test
export async function scheduleABTestCompletion(
  link: Pick<ExpandedLink, "id" | "testVariants" | "testCompletedAt">,
) {
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
