"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import IntegrationCard from "@/ui/oauth-apps/integration-card";
import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function IntegrationsPageClient({
  integrations,
}: {
  integrations: InstalledIntegrationProps[];
}) {
  const { slug, flags } = useWorkspace();

  if (!flags?.integrations) {
    redirect(`/${slug}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between">
        <div className="flex items-center gap-x-2">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            Integrations
          </h1>
        </div>
        <div className="flex w-full items-center gap-3 sm:w-auto">
          <Link
            href={`/${slug}/settings/oauth-apps`}
            className={cn(
              buttonVariants({ variant: "primary" }),
              "flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
            )}
          >
            Create Integration
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.clientId} {...integration} />
        ))}
      </div>
    </div>
  );
}
