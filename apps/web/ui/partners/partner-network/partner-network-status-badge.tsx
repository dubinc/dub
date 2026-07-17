import { BadgeCheck2, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";
import { PartnerNetworkStatus } from "@prisma/client";
import { TrustedPartnerBadge } from "../trusted-partner-badge";

export function PartnerNetworkStatusBadge({
  networkStatus,
  size = "small",
}: {
  networkStatus: PartnerNetworkStatus;
  size?: "small" | "large";
}) {
  if (networkStatus === "trusted") {
    return <TrustedPartnerBadge variant="inline" size={size} />;
  }

  if (networkStatus === "approved") {
    return (
      <Tooltip
        content={
          <div className="flex max-w-xs items-start gap-1.5 p-3">
            <BadgeCheck2
              variant="fill"
              className="mt-0.5 size-5 shrink-0 text-blue-500"
            />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-neutral-900">
                Approved Partner
              </span>
              <span className="text-sm font-normal text-neutral-600">
                This partner is approved in the Dub Partner Network.
              </span>
            </div>
          </div>
        }
      >
        <BadgeCheck2
          variant="fill"
          className={cn(
            "shrink-0 text-blue-500",
            size === "small" ? "size-3.5" : "size-5",
          )}
        />
      </Tooltip>
    );
  }

  return null;
}
