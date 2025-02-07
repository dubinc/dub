import useWorkspace from "@/lib/swr/use-workspace";
import { OAuthAppProps } from "@/lib/types";
import { BlurImage, TokenAvatar } from "@dub/ui";
import { formatDate } from "@dub/utils";
import Link from "next/link";

export default function OAuthAppCard(oAuthApp: OAuthAppProps) {
  const { slug } = useWorkspace();

  return (
    <Link
      href={`/${slug}/settings/oauth-apps/${oAuthApp.id}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-[filter]"
    >
      <div className="flex items-center gap-x-3">
        <div className="rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
          {oAuthApp.logo ? (
            <BlurImage
              src={oAuthApp.logo}
              alt={`Logo for ${oAuthApp.name}`}
              className="size-6 rounded-full"
              width={20}
              height={20}
            />
          ) : (
            <TokenAvatar id={oAuthApp.clientId} className="size-6" />
          )}
        </div>
        <div>
          <p className="font-semibold text-neutral-700">{oAuthApp.name}</p>
          <div className="flex items-center gap-1 text-sm text-neutral-500">
            Last updated
            <span className="font-medium text-neutral-700">
              {formatDate(oAuthApp.updatedAt, { year: undefined })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
