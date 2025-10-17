import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Tooltip } from "@dub/ui";
import { formatDateTime, OG_AVATAR_URL, timeAgo } from "@dub/utils";
import { CampaignEvent } from "./campaign-events";

export const campaignEventsColumns = [
  {
    id: "partner",
    header: "",
    enableHiding: false,
    cell: ({ row }: { row: { original: CampaignEvent } }) => (
      <div className="flex gap-2">
        <div className="flex h-8 shrink-0 items-center justify-center">
          <img
            src={
              row.original.partner.image ||
              `${OG_AVATAR_URL}${row.original.partner.name}`
            }
            alt={row.original.partner.name}
            className="size-7 rounded-full object-cover"
          />
        </div>
        <div className="flex h-8 min-w-0 flex-1 flex-col">
          <div className="text-content-emphasis truncate text-xs font-semibold">
            {row.original.partner.name}
          </div>
          {row.original.group && (
            <div className="flex items-center gap-1">
              <GroupColorCircle group={row.original.group} />
              <span className="text-content-subtle truncate text-xs font-medium">
                {row.original.group?.name}
              </span>
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    id: "timestamp",
    header: "",
    enableHiding: false,
    minSize: 60,
    cell: ({ row }: { row: { original: CampaignEvent } }) => {
      const timestamp = getTimestamp(row.original);

      return (
        <Tooltip
          content={timestamp ? formatDateTime(timestamp) : "-"}
          side="top"
        >
          <div
            className="text-content-subtle flex h-8 shrink-0 items-center justify-end text-xs font-medium"
            onClick={(e) => e.preventDefault()}
          >
            {timeAgo(timestamp)}
          </div>
        </Tooltip>
      );
    },
  },
];

const getTimestamp = (event: CampaignEvent) => {
  if (event.deliveredAt) {
    return event.deliveredAt;
  }

  if (event.openedAt) {
    return event.openedAt;
  }

  if (event.bouncedAt) {
    return event.bouncedAt;
  }

  return null;
};
