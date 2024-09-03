"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import AddEditWebhookForm from "@/ui/webhooks/add-edit-webhook-form";
import { MaxWidthWrapper } from "@dub/ui";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function NewWebhookPageClient({
  newSecret,
}: {
  newSecret: string;
}) {
  const { slug, flags, role, plan } = useWorkspace();

  const needsHigherPlan = plan === "free" || plan === "pro";

  if (!flags?.webhooks) {
    redirect(`/${slug}/settings`);
  }

  if (needsHigherPlan) {
    redirect(`/${slug}/settings/webhooks`);
  }

  return (
    <>
      <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
        <Link
          href={`/${slug}/settings/webhooks`}
          className="flex items-center gap-x-1"
        >
          <ChevronLeft className="size-4" />
          <p className="text-sm font-medium text-gray-500">Back to webhooks</p>
        </Link>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        <AddEditWebhookForm webhook={null} newSecret={newSecret} />
      </MaxWidthWrapper>
    </>
  );
}
