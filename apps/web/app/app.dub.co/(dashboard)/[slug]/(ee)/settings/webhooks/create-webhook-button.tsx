"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CreateWebhookButton() {
  const pathname = usePathname();

  const { slug, plan, role } = useWorkspace();

  const { canCreateWebhooks } = getPlanCapabilities(plan);

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role: role,
  });

  // don't show button if not on main webhooks page or if workspace cannot create webhooks
  if (!canCreateWebhooks || !pathname.endsWith("/settings/webhooks")) {
    return null;
  }

  return (
    <Link href={`/${slug}/settings/webhooks/new`}>
      <Button
        className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm"
        text="Create Webhook"
        disabledTooltip={permissionsError}
      />
    </Link>
  );
}
