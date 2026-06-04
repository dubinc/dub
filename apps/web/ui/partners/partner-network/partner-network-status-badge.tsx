import { PartnerNetworkStatus } from "@dub/prisma/client";
import { BadgeCheck2Fill, Tooltip } from "@dub/ui";
import { TrustedPartnerBadge } from "../trusted-partner-badge";

export function PartnerNetworkStatusBadge({
  networkStatus,
}: {
  networkStatus: PartnerNetworkStatus;
}) {
  if (networkStatus === "trusted") {
    return <TrustedPartnerBadge variant="inline" />;
  }

  if (networkStatus === "approved") {
    return (
      <Tooltip
        content={
          <div className="flex max-w-xs items-start gap-1.5 p-3">
            <BadgeCheck2Fill className="mt-0.5 size-5 shrink-0 text-blue-500" />
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
        <BadgeCheck2Fill className="size-3.5 shrink-0 text-blue-500" />
      </Tooltip>
    );
  }

  return null;
}
