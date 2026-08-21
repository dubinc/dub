"use client";

import useIntegrations from "@/lib/swr/use-integrations";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import { IntegrationLogo } from "@/ui/integrations/integration-logo";
import { IntegrationStatusBadge } from "@/ui/integrations/integration-status-badge";
import { cn } from "@dub/utils";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function EnabledIntegrations() {
  const searchParams = useSearchParams();
  const search = searchParams.get("search");

  const { slug } = useWorkspace();
  const { integrations: activeIntegrations } = useIntegrations();

  return activeIntegrations?.length ? (
    <AnimatePresence initial={false}>
      {!search && (
        <motion.div
          key="enabled-integrations"
          initial={{ opacity: 0, translateY: 10 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 10 }}
          transition={{ duration: 0.1 }}
        >
          <div className="flex items-center justify-between text-sm">
            <h2 className="font-medium leading-4 text-neutral-800">
              Enabled integrations
            </h2>
            <Link
              href={`/${slug}/settings/integrations/enabled`}
              className="font-medium leading-4 text-neutral-500 transition-colors duration-100 hover:text-neutral-700"
            >
              View all ({activeIntegrations.length})
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
            {activeIntegrations.slice(0, 3).map((integration) => (
              <li key={integration.id}>
                <IntegrationRow integration={integration} />
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  ) : null;
}

function IntegrationRow({
  integration,
}: {
  integration: InstalledIntegrationProps;
}) {
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
        <IntegrationLogo
          src={integration.logo ?? null}
          alt={`Logo for ${integration.name}`}
        />

        <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-800">
          {integration.name}
          <IntegrationStatusBadge
            projectId={integration.projectId}
            verified={integration.verified}
          />
        </span>
      </div>
      <ChevronRight className="size-4 text-neutral-400 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-neutral-600" />
    </Link>
  );
}
