import { BadgeCheck2, DubCraftedShield, Tooltip } from "@dub/ui";
import { CircleWarning } from "@dub/ui/icons";
import { DUB_WORKSPACE_ID } from "@dub/utils";

export function IntegrationStatusBadge({
  projectId,
  verified,
}: {
  projectId: string;
  verified: boolean;
}) {
  if (projectId === DUB_WORKSPACE_ID) {
    return (
      <Tooltip content="This is an official integration built and maintained by Dub">
        <span>
          <DubCraftedShield className="size-4 shrink-0 -translate-y-px" />
        </span>
      </Tooltip>
    );
  }

  if (verified) {
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
                Verified Integration
              </span>
              <span className="text-sm font-normal text-neutral-600">
                This integration has been verified by Dub.
              </span>
            </div>
          </div>
        }
      >
        <BadgeCheck2 variant="fill" className="size-4 shrink-0 text-blue-500" />
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Dub hasn't verified this integration. Install it at your own risk.">
      <span>
        <CircleWarning
          className="size-4 shrink-0 text-neutral-500"
          variant="fill"
        />
      </span>
    </Tooltip>
  );
}
