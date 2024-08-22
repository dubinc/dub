import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import { TokenAvatar } from "@dub/ui";
import Link from "next/link";

export default function WebhookCard(webhook: WebhookProps) {
  const { slug } = useWorkspace();

  return (
    <Link
      href={`/${slug}/settings/webhooks/${webhook.id}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-gray-200 bg-white px-5 py-4 transition-[filter]"
    >
      <div className="flex items-center gap-x-3">
        <div className="rounded-md border border-gray-200 bg-gradient-to-t from-gray-100 p-2.5">
          <TokenAvatar id={webhook.name} className="size-6" />
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-semibold text-gray-700">{webhook.name}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            {webhook.url}
          </div>
        </div>
      </div>
    </Link>
  );
}
