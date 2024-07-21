"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { useAddEditAppModal } from "@/ui/modals/add-edit-oauth-app-modal";
import { useAppCreatedModal } from "@/ui/modals/oauth-app-created-modal";
import { Button, MaxWidthWrapper, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useState } from "react";
import IntegrationCard from "./integration-card";

export default function IntegrationsPageClient({
  integrations,
}: {
  integrations: (OAuthAppProps & {
    installations: number;
    installed: boolean;
  })[];
}) {
  const { slug, flags } = useWorkspace();

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
        <div className="grid gap-4 sm:grid-cols-3">
          {integrations.map((integration) => (
            <IntegrationCard key={integration.clientId} {...integration} />
          ))}
        </div>
      </MaxWidthWrapper>
    </>
  );
}
