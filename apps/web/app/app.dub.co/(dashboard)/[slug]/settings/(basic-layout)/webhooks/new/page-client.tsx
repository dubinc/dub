"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { BackLink } from "@/ui/shared/back-link";
import AddEditWebhookForm from "@/ui/webhooks/add-edit-webhook-form";
import { MaxWidthWrapper } from "@dub/ui";
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

  return (
    <>
      <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
        <BackLink href={`/${slug}/settings/webhooks`}>
          Back to webhooks
        </BackLink>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        <AddEditWebhookForm webhook={null} newSecret={newSecret} />
      </MaxWidthWrapper>
    </>
  );
}
