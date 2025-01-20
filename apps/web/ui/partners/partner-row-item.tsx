import { PartnerProps } from "@/lib/types";
import { GreekTemple, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { DICEBEAR_AVATAR_URL } from "@dub/utils/src/constants";
import { CircleMinus } from "lucide-react";
import { useTranslations } from "next-intl";

export function PartnerRowItem({ partner }: { partner: PartnerProps }) {
  const t = useTranslations("../ui/partners");

  return (
    <div className="flex items-center gap-2">
      <Tooltip
        content={
          <div className="grid max-w-xs gap-2 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              {t("payouts-status", {
                partnerPayoutsEnabledEnabledDisabled: partner.payoutsEnabled
                  ? "enabled"
                  : "disabled",
              })}
              <div
                className={cn(
                  "flex size-5 items-center justify-center rounded-md border border-green-300 bg-green-200 text-green-800",
                  !partner.payoutsEnabled &&
                    "border-red-300 bg-red-200 text-red-800",
                )}
              >
                {partner.payoutsEnabled ? (
                  <GreekTemple className="size-3" />
                ) : (
                  <CircleMinus className="size-3" />
                )}
              </div>
            </div>
            <div className="text-pretty text-sm text-neutral-500">
              {partner.payoutsEnabled
                ? "This partner has payouts enabled, which means they will be able to receive payouts from this program"
                : "This partner does not have payouts enabled, which means they will not be able to receive any payouts from this program"}
            </div>
          </div>
        }
      >
        <div className="relative">
          <img
            src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
            alt={partner.name}
            className="size-5 rounded-full"
          />
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-green-500",
              !partner.payoutsEnabled && "bg-red-500",
            )}
          />
        </div>
      </Tooltip>
      <div>{partner.name}</div>
    </div>
  );
}
