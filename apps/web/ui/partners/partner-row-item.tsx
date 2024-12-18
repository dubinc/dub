import { PartnerProps } from "@/lib/types";
import { Tooltip } from "@dub/ui";
import { GreekTemple } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { DICEBEAR_AVATAR_URL } from "@dub/utils/src/constants";
import { CircleMinus } from "lucide-react";

export function PartnerRowItem({ partner }: { partner: PartnerProps }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <img
          src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
          alt={partner.name}
          className="size-5 rounded-full"
        />
        <div>{partner.name}</div>
      </div>
      <Tooltip
        content={
          partner.payoutsEnabled
            ? "This partner has payouts enabled"
            : "This partner does not have payouts enabled, which means they will not be able to receive any payouts from this program"
        }
      >
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded-md border border-green-200 bg-green-100 text-green-800",
            !partner.payoutsEnabled && "border-red-200 bg-red-100 text-red-800",
          )}
        >
          {partner.payoutsEnabled ? (
            <GreekTemple className="size-3" />
          ) : (
            <CircleMinus className="size-3" />
          )}
        </div>
      </Tooltip>
    </div>
  );
}
