import { ExpandedLinkProps } from "@/lib/types";
import { UserAvatar } from "@/ui/links/link-title-column";
import { TimestampTooltip } from "@dub/ui";
import { timeAgo } from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

interface LinkCreatorInfoProps {
  link: ExpandedLinkProps;
  className?: string;
}

export function LinkCreatorInfo({ link }: { link: ExpandedLinkProps }) {
  const { slug } = useParams();

  if (!link.user) return null;

  return (
    <div className="flex items-center gap-1 border-t border-neutral-200 py-8 text-sm text-neutral-600">
      <UserAvatar user={link.user} />
      <span>Created by</span>
      <Link
        href={`/${slug}/links?userId=${link.user.id}`}
        target="_blank"
        className="cursor-alias font-semibold text-neutral-800 decoration-dotted underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        {link.user.name || link.user.email || "Anonymous User"}
      </Link>
      <span className="text-neutral-400">
        ·{" "}
        <TimestampTooltip
          timestamp={link.createdAt}
          rows={["local", "utc", "unix"]}
          delayDuration={150}
        >
          <span className="select-none">{timeAgo(link.createdAt)}</span>
        </TimestampTooltip>
      </span>
    </div>
  );
}
