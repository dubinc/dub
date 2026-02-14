import { POSTBACK_TRIGGER_DESCRIPTIONS } from "@/lib/postback/constants";
import { PartnerPostbackProps } from "@/lib/types";
import { Badge, TokenAvatar } from "@dub/ui";
import Link from "next/link";
import { PostbackStatus } from "./postback-status";

export function PostbackCard(postback: PartnerPostbackProps) {
  return (
    <Link
      href={`/profile/postbacks/${postback.id}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-neutral-200 bg-white p-3 transition-[filter]"
    >
      <div className="flex items-center gap-x-3">
        <div className="flex-shrink-0 rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
          <TokenAvatar id={postback.id} className="size-6" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-neutral-700">
              {postback.url}
            </span>
            <PostbackStatus disabledAt={postback.disabledAt} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {postback.triggers.map((trigger) => (
              <Badge
                key={trigger}
                variant="gray"
                className="rounded-md text-xs"
              >
                {POSTBACK_TRIGGER_DESCRIPTIONS[trigger]}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
