"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CreateOAuthAppButton() {
  const pathname = usePathname();
  const { slug, role } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "webhooks.write",
    role: role,
  });

  if (!pathname.endsWith("/settings/oauth-apps")) {
    return null;
  }

  return (
    <Link href={`/${slug}/settings/oauth-apps/new`}>
      <Button
        className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm"
        text="Create OAuth App"
        disabledTooltip={permissionsError}
      />
    </Link>
  );
}
