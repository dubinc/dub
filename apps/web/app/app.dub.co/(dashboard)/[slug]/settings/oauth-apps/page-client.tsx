"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import OAuthAppCard from "@/ui/oauth-apps/oauth-app-card";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import EmptyState from "@/ui/shared/empty-state";
import { Button, Cube, InfoTooltip, TooltipContent } from "@dub/ui";
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
      <div className="flex flex-wrap justify-between gap-6">
        <div className="flex items-center gap-x-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            OAuth Applications
          </h1>
          <InfoTooltip
            content={
              <TooltipContent
                title="Learn how to use OAuth applications to build integrations with Dub."
                href="https://dub.co/docs/integrations/quickstart"
                target="_blank"
                cta="Learn more"
              />
            }
          />
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Button
            className="flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm"
            text="Create OAuth App"
            onClick={() => router.push(`/${slug}/settings/oauth-apps/new`)}
            disabledTooltip={permissionsError}
          />
        </div>
      </div>

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
