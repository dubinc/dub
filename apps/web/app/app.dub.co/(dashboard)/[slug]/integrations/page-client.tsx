"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { useAddEditAppModal } from "@/ui/modals/add-edit-oauth-app-modal";
import { useAppCreatedModal } from "@/ui/modals/oauth-app-created-modal";
import EmptyState from "@/ui/shared/empty-state";
import {
  Button,
  LoadingSpinner,
  MaxWidthWrapper,
  buttonVariants,
} from "@dub/ui";
import { Key } from "@dub/ui/src/icons";
import { cn, fetcher } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import IntegrationCard from "./integration-card";

export default function IntegrationsPageClient() {
  const { slug, flags } = useWorkspace();

  const { data: allIntegrations, isLoading } = useSWR<OAuthAppProps[]>(
    "/api/integrations/list",
    fetcher,
  );

  if (!flags?.integrations) {
    redirect(`/${slug}`);
  }

  const [app, setApp] = useState<OAuthAppProps | null>(null);
  const { AppCreatedModal, setShowAppCreatedModal } = useAppCreatedModal({
    app,
  });

  const onAppCreated = (app: OAuthAppProps) => {
    if (!app) return;

    setApp(app);
    setShowAppCreatedModal(true);
  };

  const { AddEditAppModal, setShowAddEditAppModal } = useAddEditAppModal({
    onAppCreated,
  });

  return (
    <>
      <AddEditAppModal />
      <AppCreatedModal />
      <div className="flex h-36 w-full items-center border-b border-gray-200 bg-white">
        <MaxWidthWrapper>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Integrations
            </h1>
            <div className="flex gap-2">
              <Button
                text="Create Integration"
                onClick={() => setShowAddEditAppModal(true)}
              />
              <Link
                href={`/${slug}/integrations/console`}
                className={cn(
                  buttonVariants({ variant: "secondary" }),
                  "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                )}
              >
                My Integrations
              </Link>
            </div>
          </div>
        </MaxWidthWrapper>
      </div>

      <MaxWidthWrapper className="flex flex-col gap-3 py-4">
        {isLoading || !allIntegrations ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <LoadingSpinner className="h-6 w-6 text-gray-500" />
            <p className="text-sm text-gray-500">Fetching integrations...</p>
          </div>
        ) : allIntegrations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {allIntegrations.map((app) => (
              <IntegrationCard key={app.clientId} {...app} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-y-4 rounded-xl border border-gray-200 bg-white py-36">
            <EmptyState
              icon={Key}
              title="You haven't authorized any applications to access Dub workspace on your behalf."
            />
          </div>
        )}
      </MaxWidthWrapper>
    </>
  );
}
