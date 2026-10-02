import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

// Wait before we notify, so that comments posted close together go out in one email
const NOTIFICATION_DELAY_SECONDS = 60 * 3;

export async function enqueueSubmittedLeadCommentNotification({
  recipient,
  leadId,
  comment,
}: {
  recipient: "partner" | "program";
  leadId: string;
  comment: { id: string; createdAt: Date };
}) {
  return qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/submitted-leads/comments/notify-${recipient}`,
    body: {
      leadId,
      lastCommentId: comment.id,
      lastCommentCreatedAt: comment.createdAt.toISOString(),
    },
    delay: NOTIFICATION_DELAY_SECONDS,
  });
}

// Get the unsent comments for the job's email, oldest first. Returns null when
// an unsent comment is newer than the job's comment, because the job for that
// comment sends the email. A deleted comment has no row, so it does not block.
export function getSubmittedLeadCommentsToNotify<
  T extends { createdAt: Date },
>({
  unsentComments,
  lastCommentCreatedAt,
}: {
  unsentComments: T[];
  lastCommentCreatedAt: Date;
}) {
  if (
    unsentComments.some(
      ({ createdAt }) => createdAt.getTime() > lastCommentCreatedAt.getTime(),
    )
  ) {
    return null;
  }

  return [...unsentComments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}
