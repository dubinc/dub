import { BadgeCheck2Fill, Tooltip } from "@dub/ui";

export function PartnerSocialColumn({
  at,
  value,
  verified,
}: {
  at?: boolean;
  value: string;
  verified: boolean;
}) {
  return value ? (
    <div className="flex items-center gap-2">
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
    </div>
  ) : (
    "-"
  );
}
