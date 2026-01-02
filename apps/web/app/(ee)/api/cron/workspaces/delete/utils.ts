import { qstash } from "@/lib/cron";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { z } from "zod";
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
  startingAfter: z.string().optional(),
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
  const hasMore = items.length === maxBatchSize;

  const { messageId } = await qstash.publishJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workspaces/delete`,
    body: {
      ...payload,
      startingAfter: hasMore ? items[items.length - 1].id : undefined,
      step: hasMore ? currentStep : nextStep,
    },
  });

  return logAndRespond(
    hasMore
      ? `Enqueued next batch for step "${currentStep}" (messageId: ${messageId})`
      : `Completed step "${currentStep}", moving to "${nextStep}" (messageId: ${messageId})`,
  );
}
