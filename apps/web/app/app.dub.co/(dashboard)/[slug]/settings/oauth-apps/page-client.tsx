"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import OAuthAppCard from "@/ui/oauth-apps/oauth-app-card";
import OAuthAppPlaceholder from "@/ui/oauth-apps/oauth-app-placeholder";
import EmptyState from "@/ui/shared/empty-state";
import { buttonVariants, Cube, TooltipContent } from "@dub/ui";
import { InfoTooltip } from "@dub/ui/src/tooltip";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import useSWR from "swr";

export default function OAuthAppsPageClient() {
  const { slug, id: workspaceId, flags } = useWorkspace();

  if (!flags?.integrations) {
    redirect(`/${slug}`);
  }

  const { data: oAuthApps, isLoading } = useSWR<OAuthAppProps[]>(
    `/api/oauth/apps?workspaceId=${workspaceId}`,
    fetcher,
  );

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
                title="Learn more about how to manage OAuth applications on Dub."
                href="https://dub.co/help/category/custom-domains"
                target="_blank"
                cta="Learn more"
              />
            }
          />
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Link
            href={`/${slug}/settings/oauth-apps/new`}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
            )}
          >
            Add OAuth App
          </Link>
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
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
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
