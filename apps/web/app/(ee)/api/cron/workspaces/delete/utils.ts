import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const deleteWorkspaceSchema = z.object({
  workspaceId: z.string(),
  step: z
    .enum([
      "delete-links",
      "delete-domains",
      "delete-folders",
      "delete-customers",
      "delete-workspace",
    ])
    .optional()
    .default("delete-links"),
});

export type DeleteWorkspacePayload = z.infer<typeof deleteWorkspaceSchema>;

export async function enqueueNextWorkspaceDeleteStep({
  payload,
  currentStep,
  nextStep,
  items,
  maxBatchSize,
}: {
  payload: DeleteWorkspacePayload;
  currentStep: DeleteWorkspacePayload["step"];
  nextStep: DeleteWorkspacePayload["step"];
  items: { id: string }[];
  maxBatchSize: number;
}) {
  // Each step deletes the rows it fetched in-place, so the next invocation just
  // re-fetches the first N remaining rows. We re-enqueue the same step until a
  // batch comes back smaller than maxBatchSize, signaling that there's nothing
  // left to delete for this step.
  const hasMore = items.length === maxBatchSize;

  const { messageId } = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
    body: {
      ...payload,
      step: hasMore ? currentStep : nextStep,
    },
  });

  return logAndRespond(
    hasMore
      ? `Enqueued next batch for step "${currentStep}" (messageId: ${messageId})`
      : `Completed step "${currentStep}", moving to "${nextStep}" (messageId: ${messageId})`,
  );
}
