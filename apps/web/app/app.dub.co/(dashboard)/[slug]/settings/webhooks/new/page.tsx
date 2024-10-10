import { createWebhookSecret } from "@/lib/webhook/secret";
import NewWebhookPageClient from "./page-client";

export default async function NewWebhookPage() {
  return <NewWebhookPageClient newSecret={createWebhookSecret()} />;
}
