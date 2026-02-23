import { PostbackProps } from "@/lib/types";
import { Slack, TokenAvatar } from "@dub/ui";
import Link from "next/link";
import { PostbackStatus } from "./postback-status";

export function PostbackCard(postback: PostbackProps) {
  return (
    <Link
      href={`/profile/postbacks/${postback.id}`}
      className="hover:drop-shadow-card-hover relative rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-[filter]"
    >
      <div className="flex items-center gap-x-3">
        <div className="flex-shrink-0 rounded-md border border-neutral-200 bg-gradient-to-t from-neutral-100 p-2.5">
          {postback.receiver === "slack" ? (
            <Slack className="size-6" />
          ) : (
            <TokenAvatar id={postback.name} className="size-6" />
          )}
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-neutral-700">
              {postback.name}
            </span>
            <PostbackStatus disabledAt={postback.disabledAt} />
          </div>
          <div className="truncate text-sm text-neutral-500">
            {postback.url}
          </div>
        </div>
      </div>
    </Link>
  );
}
