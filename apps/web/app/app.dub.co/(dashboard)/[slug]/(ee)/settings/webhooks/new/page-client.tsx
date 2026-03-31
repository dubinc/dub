"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import AddEditWebhookForm from "@/ui/webhooks/add-edit-webhook-form";
import { redirect } from "next/navigation";

export default function NewWebhookPageClient({
  newSecret,
}: {
  newSecret: string;
}) {
  const { slug, plan } = useWorkspace();

  const needsHigherPlan = plan === "free" || plan === "pro";

  if (needsHigherPlan) {
    redirect(`/${slug}/settings/webhooks`);
  }

  return <AddEditWebhookForm webhook={null} newSecret={newSecret} />;
}
