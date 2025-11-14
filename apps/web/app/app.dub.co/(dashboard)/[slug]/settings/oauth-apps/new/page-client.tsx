"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import AddOAuthAppForm from "@/ui/oauth-apps/add-edit-app-form";
import { BackLink } from "@/ui/shared/back-link";
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
      <BackLink href={`/${slug}/settings/oauth-apps`}>
        Back to OAuth Apps
      </BackLink>

      <AddOAuthAppForm oAuthApp={null} />
    </MaxWidthWrapper>
  );
}
