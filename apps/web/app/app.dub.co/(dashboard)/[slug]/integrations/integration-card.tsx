import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAuthorizedAppProps } from "@/lib/types";
import { BlurImage, TokenAvatar } from "@dub/ui";
import Link from "next/link";

export default function IntegrationCard(app: OAuthAuthorizedAppProps) {
  const { slug } = useWorkspace();
  return (
    <Link
      href={`/${slug}/integrations/${app.slug}`}
      className="relative rounded-xl border border-gray-200 bg-white px-5 py-4"
    >
      <div className="flex items-center space-x-3">
        {app.logo ? (
          <BlurImage
            src={app.logo}
            alt={`Logo for ${app.name}`}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
        ) : (
          <TokenAvatar id={app.clientId} />
        )}
        <div className="flex flex-col space-y-px">
          <p className="font-semibold text-gray-700">{app.name}</p>
          <p className="text-sm text-gray-500">Installed</p>
        </div>
      </div>
    </Link>
  );
}
