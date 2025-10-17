"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import AddOAuthAppForm from "@/ui/oauth-apps/add-edit-app-form";
import { MaxWidthWrapper } from "@dub/ui";
import { redirect } from "next/navigation";

export default function NewOAuthAppPageClient() {
  const { slug, role } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "oauth_apps.write",
    role,
  });

  if (permissionsError) {
    redirect(`/${slug}/settings`);
  }

  return (
    <MaxWidthWrapper className="max-w-screen-lg space-y-6">
      <AddOAuthAppForm oAuthApp={null} />
    </MaxWidthWrapper>
  );
}
