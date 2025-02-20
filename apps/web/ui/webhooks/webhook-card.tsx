import useWorkspace from "@/lib/swr/use-workspace";
import { WebhookProps } from "@/lib/types";
import { TokenAvatar } from "@dub/ui";
import Link from "next/link";
import { WebhookStatus } from "./webhook-status";

export default function WebhookCard(webhook: WebhookProps) {
  const { slug } = useWorkspace();

  return (
    <Link
      href={`/${slug}/settings/webhooks/${webhook.id}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-[filter]"
    >
      <div className="flex items-center gap-x-3">
        <div className="flex-shrink-0 rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
          <TokenAvatar id={webhook.name} className="size-6" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-neutral-700">
              {webhook.name}
            </span>
            <WebhookStatus webhook={webhook} />
          </div>
          <div className="truncate text-sm text-neutral-500">{webhook.url}</div>
        </div>
      </div>
    </Link>
  );
}
