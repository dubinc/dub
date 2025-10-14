"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
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
    <>
      <MaxWidthWrapper className="grid max-w-screen-lg gap-8">
        <BackLink href={`/${slug}/settings/oauth-apps`}>
          Back to OAuth Apps
        </BackLink>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="max-w-screen-lg space-y-6">
        <AddOAuthAppForm oAuthApp={null} />
      </MaxWidthWrapper>
    </>
  );
}
