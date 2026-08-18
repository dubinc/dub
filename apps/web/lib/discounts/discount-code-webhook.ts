import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { DiscountCodeWebhookSchema } from "@/lib/zod/schemas/discount";
import { DiscountProvider, Project } from "@prisma/client";
import * as z from "zod/v4";

export async function sendDiscountCodeWebhook({
  trigger,
  data,
  workspace,
}: {
  trigger:
    | "discount_code.created"
    | "discount_code.updated"
    | "discount_code.deleted";
  data: z.infer<typeof DiscountCodeWebhookSchema>;
  workspace: Pick<Project, "id" | "webhookEnabled">;
}) {
  // Only send webhook for custom discount provider for now
  if (data.discount?.provider !== DiscountProvider.custom) {
    return;
  }

  await sendWorkspaceWebhook({
    trigger,
    workspace,
    data: DiscountCodeWebhookSchema.parse(data),
  });
}
