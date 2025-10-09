"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import OAuthAppCard from "@/ui/oauth-apps/oauth-app-card";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import EmptyState from "@/ui/shared/empty-state";
import { Cube } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useRouter } from "next/navigation";
import useSWR from "swr";

export default function OAuthAppsPageClient() {
  const router = useRouter();
  const { slug, id: workspaceId, role } = useWorkspace();

  const { data: oAuthApps, isLoading } = useSWR<OAuthAppProps[]>(
    `/api/oauth/apps?workspaceId=${workspaceId}`,
    fetcher,
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "oauth_apps.write",
    role,
  });

  return (
    <div className="grid gap-5">
      <div className="animate-fade-in">
        {!isLoading ? (
          oAuthApps && oAuthApps.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {oAuthApps.map((oAuthApp) => (
                <OAuthAppCard {...oAuthApp} key={oAuthApp.id} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-neutral-200 py-10">
              <EmptyState icon={Cube} title={"No OAuth applications found"} />
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <OAuthAppPlaceholder />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
