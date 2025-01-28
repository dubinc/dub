"use client";

import useIntegrations from "@/lib/swr/use-integrations";
import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage } from "@dub/ui";
import { cn } from "@dub/utils";
import { Integration } from "@prisma/client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { IntegrationsWithInstallations } from "./integrations-list";

export async function EnabledIntegrations({
  integrations,
}: {
  integrations: IntegrationsWithInstallations;
}) {
  const { slug } = useWorkspace();
  const { integrations: activeIntegrations } = useIntegrations();

  const enabledIntegrations = integrations.filter((i) =>
    activeIntegrations?.some((ai) => ai.id === i.id),
  );

  return enabledIntegrations?.length ? (
    <div>
      <div className="flex items-center justify-between text-sm">
        <h2 className="font-medium leading-4 text-neutral-800">
          Enabled integrations
        </h2>
        <Link
          href={`/${slug}/settings/integrations/enabled`}
          className="font-medium leading-4 text-neutral-500 transition-colors duration-100 hover:text-neutral-700"
        >
          View all
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
        {enabledIntegrations.slice(0, 3).map((integration) => (
          <li key={integration.id}>
            <IntegrationRow integration={integration} />
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}

function IntegrationRow({ integration }: { integration: Integration }) {
  const { slug } = useWorkspace();

  return (
    <Link
      href={`/${slug}/settings/integrations/${integration?.slug}`}
      className={cn(
        "group flex items-center justify-between p-3 pr-5 text-sm",
        "transition-colors duration-75 hover:bg-neutral-50",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {integration.logo ? (
          <div className="relative">
            <BlurImage
              src={integration.logo}
              alt={`Logo for ${integration.name}`}
              className="relative size-8 rounded-md"
              width={20}
              height={20}
            />
            <div className="pointer-events-none absolute inset-0 rounded-md border border-black/5" />
          </div>
        ) : (
          <div className="size-8 rounded-md bg-neutral-200" />
        )}

        <span className="text-sm font-medium text-neutral-800">
          {integration.name}
        </span>
      </div>
      <ChevronRight className="size-4 text-neutral-400 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-600" />
    </Link>
  );
}
