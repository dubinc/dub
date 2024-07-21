import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { BlurImage, TokenAvatar } from "@dub/ui";
import Link from "next/link";

export default function IntegrationCard(
  integration: OAuthAppProps & { installations: number; installed: boolean },
) {
  const { slug } = useWorkspace();

  return (
    <Link
      href={`/${slug}/integrations/${integration.slug}`}
      className="relative rounded-xl border border-gray-200 bg-white px-5 py-4 transition-[filter] hover:[filter:drop-shadow(0_8px_12px_#222A350d)_drop-shadow(0_32px_80px_#2f30370f)]"
    >
      {integration.installed && (
        <p className="absolute right-4 top-4 text-xs text-gray-500">
          INSTALLED
        </p>
      )}
      <div className="flex items-center gap-x-3">
        <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2">
          {integration.logo ? (
            <BlurImage
              src={integration.logo}
              alt={`Logo for ${integration.name}`}
              className="size-6 rounded-full border border-gray-200"
              width={20}
              height={20}
            />
          ) : (
            <TokenAvatar id={integration.clientId} className="size-6" />
          )}
        </div>
        <p className="font-semibold text-gray-700">{integration.name}</p>
      </div>
      <div className="mt-4 grid gap-2">
        <p className="text-sm text-gray-500">{integration.description}</p>
        <p className="text-sm text-gray-500">
          Built by{" "}
          <span className="font-medium text-gray-700">
            {integration.developer}
          </span>
        </p>
      </div>
    </Link>
  );
}
