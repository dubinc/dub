import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// Wait before we notify, so that comments posted close together go out in one email
const NOTIFICATION_DELAY_SECONDS = 60 * 3;

export async function enqueueSubmittedLeadCommentNotification({
  recipient,
  leadId,
  commentId,
}: {
  recipient: "partner" | "program";
  leadId: string;
  commentId: string;
}) {
  return qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/submitted-leads/comments/notify-${recipient}`,
    body: {
      leadId,
      lastCommentId: commentId,
    },
    delay: NOTIFICATION_DELAY_SECONDS,
  });
}

// Get the comments to include in one email, oldest first. Each notification
// job skips when a newer comment exists, so a comment that was posted less than
// the delay before the next one has not been sent yet.
export function getSubmittedLeadCommentNotificationBatch<
  T extends { createdAt: Date },
>(commentsNewestFirst: T[]) {
  const batch: T[] = [];

  for (const comment of commentsNewestFirst) {
    const newer = batch[batch.length - 1];

    if (
      newer &&
      newer.createdAt.getTime() - comment.createdAt.getTime() >=
        NOTIFICATION_DELAY_SECONDS * 1000
    ) {
      break;
    }

    batch.push(comment);
  }

  return batch.reverse();
}
