import useInstalledIntegrations from "@/lib/swr/use-installed-integrations";
import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { BlurImage, TokenAvatar } from "@dub/ui";
import Link from "next/link";

export default function IntegrationCard(app: OAuthAppProps) {
  const { slug } = useWorkspace();

  const { integrations: installedIntegrations } = useInstalledIntegrations();
  const installed =
    installedIntegrations?.find((i) => i.clientId === app.clientId) || false;

  return (
    <Link
      href={`/${slug}/integrations/${app.slug}`}
      className="relative rounded-xl border border-gray-200 bg-white px-5 py-4 transition-[filter] hover:[filter:drop-shadow(0_8px_12px_#222A350d)_drop-shadow(0_32px_80px_#2f30370f)]"
    >
      {installed && (
        <p className="absolute right-4 top-4 text-xs text-gray-500">
          INSTALLED
        </p>
      )}
      <div className="flex items-center gap-x-3">
        <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
          {app.logo ? (
            <BlurImage
              src={app.logo}
              alt={`Logo for ${app.name}`}
              className="size-6 rounded-full border border-gray-200"
              width={20}
              height={20}
            />
          ) : (
            <TokenAvatar id={app.clientId} className="size-6" />
          )}
        </div>
        <p className="font-semibold text-gray-700">{app.name}</p>
      </div>
      <div className="mt-4 grid gap-2">
        <p className="text-sm text-gray-500">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam,
          quos.
        </p>
        <p className="text-sm text-gray-500">
          Built by{" "}
          <span className="font-medium text-gray-700">{app.developer}</span>
        </p>
      </div>
    </Link>
  );
}
