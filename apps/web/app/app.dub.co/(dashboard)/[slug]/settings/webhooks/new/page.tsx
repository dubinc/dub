import { createToken } from "@/lib/api/oauth/utils";
import {
  WEBHOOK_SECRET_LENGTH,
  WEBHOOK_SECRET_PREFIX,
} from "@/lib/webhook/constants";
import NewWebhookPageClient from "./page-client";

export default async function NewWebhookPage() {
  const newSecret = createToken({
    prefix: WEBHOOK_SECRET_PREFIX,
    length: WEBHOOK_SECRET_LENGTH,
  });

  return <NewWebhookPageClient newSecret={newSecret} />;
}
