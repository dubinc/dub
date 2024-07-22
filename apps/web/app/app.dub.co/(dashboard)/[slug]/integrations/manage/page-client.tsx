"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import OAuthAppPlaceholder from "@/ui/integrations/oauth-app-placeholder";
import EmptyState from "@/ui/shared/empty-state";
import { MaxWidthWrapper, buttonVariants } from "@dub/ui";
import { HexadecagonStar } from "@dub/ui/src/icons";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import useSWR from "swr";
import OAuthAppCard from "../../../../../../ui/integrations/oauth-app-card";

export default function IntegrationConsolePageClient() {
  const { slug, id: workspaceId, flags } = useWorkspace();

  if (!flags?.integrations) {
    redirect(`/${slug}`);
  }

  const { data: integrations, isLoading } = useSWR<OAuthAppProps[]>(
    `/api/oauth/apps?workspaceId=${workspaceId}`,
    fetcher,
  );

  return (
    <>
      <div className="flex h-36 w-full items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              My Integrations
            </h1>
            <div className="flex gap-2">
              <Link
                href={`/${slug}/integrations/new`}
                className={cn(
                  buttonVariants({ variant: "primary" }),
                  "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                )}
              >
                Create Integration
              </Link>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>

      <MaxWidthWrapper className="flex flex-col gap-3 py-4">
        {integrations && integrations.length === 0 ? (
          <div className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white py-10">
            <EmptyState
              icon={HexadecagonStar}
              title="No integrations found"
              description="You haven't added any integrations yet."
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {isLoading || !integrations
              ? Array.from({ length: 3 }).map((_, i) => (
                  <OAuthAppPlaceholder key={i} />
                ))
              : integrations.map((integration) => (
                  <OAuthAppCard key={integration.id} {...integration} />
                ))}
          </div>
        )}
      </MaxWidthWrapper>
    </>
  );
}
