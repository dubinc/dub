import useIntegrations from "@/lib/swr/use-integrations";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationProps } from "@/lib/types";
import { BlurImage, TokenAvatar } from "@dub/ui";
import { Download, OfficeBuilding } from "@dub/ui/src/icons";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";

export default function IntegrationCard(
  integration: InstalledIntegrationProps,
) {
  const { slug } = useWorkspace();
  const { integrations: activeIntegrations } = useIntegrations();

  const installed = activeIntegrations?.some((i) => i.id === integration.id);

  return (
    <Link
      href={`/${slug}/settings/integrations/${integration.slug}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-gray-200 bg-white px-5 py-4 transition-[filter]"
    >
      {installed && (
        <p className="absolute right-4 top-4 text-xs text-gray-500">
          INSTALLED
        </p>
      )}
      <div className="flex items-center gap-x-3">
        <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2.5">
          {integration.logo ? (
            <BlurImage
              src={integration.logo}
              alt={`Logo for ${integration.name}`}
              className="size-6 rounded-full"
              width={20}
              height={20}
            />
          ) : (
            <TokenAvatar id={integration.id} className="size-6" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="font-semibold text-gray-700">{integration.name}</p>
            {integration.verified && (
              <BadgeCheck className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <OfficeBuilding className="size-3" />
            <span className="text-sm">{integration.developer}</span>
          </div>
        </div>
      </div>
      <div className="items-between grid h-24 pt-4">
        <p className="line-clamp-3 text-sm text-gray-500">
          {integration.description}
        </p>
        <div className="flex items-center justify-end gap-1 text-gray-500">
          <Download className="size-4" />
          <span className="text-sm">
            {integration.installations} install
            {integration.installations === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </Link>
  );
}
