"use client";

import useIntegrations from "@/lib/swr/use-integrations";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import { Tooltip } from "@dub/ui";
import { CircleWarning, ShieldCheck } from "@dub/ui/icons";
import Link from "next/link";
import { IntegrationLogo } from "./integration-logo";

export default function IntegrationCard(
  integration: InstalledIntegrationProps,
) {
  const { slug } = useWorkspace();
  const { integrations: activeIntegrations } = useIntegrations();

  const installed = activeIntegrations?.some((i) => i.id === integration.id);

  return (
    <Link
      href={`/${slug}/settings/integrations/${integration.slug}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-gray-200 bg-white p-4 transition-[filter]"
    >
      {installed && (
        <div className="absolute right-4 top-4 rounded bg-green-100 px-2 py-1 text-[0.625rem] font-semibold uppercase leading-none text-green-800">
          Enabled
        </div>
      )}
      <IntegrationLogo src={integration.logo ?? null} alt={integration.name} />
      <h3 className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
        {integration.name}
        <Tooltip
          content={
            integration.verified
              ? "This is a verified integration."
              : "Dub hasn't verified this integration. Install it at your own risk."
          }
        >
          <div>
            {integration.verified ? (
              <ShieldCheck className="size-4 text-[#E2B87C]" invert />
            ) : (
              <CircleWarning className="size-4 text-gray-500" invert />
            )}
          </div>
        </Tooltip>
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-neutral-600">
        {integration.description}
      </p>
    </Link>
  );
}
