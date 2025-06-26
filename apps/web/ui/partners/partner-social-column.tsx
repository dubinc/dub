import { BadgeCheck2Fill, Tooltip } from "@dub/ui";
import { getUrlFromString } from "@dub/utils";
import Link from "next/link";

export function PartnerSocialColumn({
  at,
  value,
  verified,
  href,
}: {
  at?: boolean;
  value: string;
  verified: boolean;
  href: string;
}) {
  return value && href ? (
    <Link
      href={getUrlFromString(href)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 hover:underline"
    >
      <span className="min-w-0 truncate">
        {at && "@"}
        {value}
      </span>
      {verified && (
        <Tooltip content="Verified" disableHoverableContent>
          <div>
            <BadgeCheck2Fill className="size-4 text-green-600" />
          </div>
        </Tooltip>
      )}
    </Link>
  ) : (
    "-"
  );
}
