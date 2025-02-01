"use client";

import useIntegrations from "@/lib/swr/use-integrations";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import { DubCraftedShield, Tooltip } from "@dub/ui";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import Link from "next/link";
import { IntegrationLogo } from "./integration-logo";

export default function IntegrationCard(
  integration: InstalledIntegrationProps,
) {
  const { slug } = useWorkspace();
  const { integrations: activeIntegrations } = useIntegrations();

  const installed = activeIntegrations?.some((i) => i.id === integration.id);

  const dubCrafted = integration.projectId === DUB_WORKSPACE_ID;

  return (
    <Link
      href={`/${slug}/settings/integrations/${integration.slug}`}
      className="hover:drop-shadow-card-hover relative rounded-lg border border-gray-200 bg-white p-4 transition-[filter]"
    >
      {installed && (
        <div className="absolute right-4 top-4 rounded bg-green-100 px-2 py-1 text-[0.625rem] font-semibold uppercase leading-none text-green-800">
          Enabled
        </div>
      )}
      <IntegrationLogo src={integration.logo ?? null} alt={integration.name} />
      <h3 className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        {integration.name}
        {dubCrafted && (
          <Tooltip content="Dub Crafted">
            {/* TODO: Add "Learn more" link ^ */}
            <div>
              <DubCraftedShield className="size-4 -translate-y-px" />
            </div>
          </Tooltip>
        )}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-neutral-600">
        {integration.description}
      </p>
    </Link>
  );
}
