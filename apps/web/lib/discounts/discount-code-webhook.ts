import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { DiscountCodeWebhookSchema } from "@/lib/zod/schemas/discount";
import { Project } from "@prisma/client";
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
  await sendWorkspaceWebhook({
    trigger,
    workspace,
    data: DiscountCodeWebhookSchema.parse(data),
  });
}
