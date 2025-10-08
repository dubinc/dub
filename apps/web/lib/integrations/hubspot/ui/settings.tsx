"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID } from "../constants";
import { updateHubSpotSettingsAction } from "../update-hubspot-settings";

export const HubSpotSettings = ({
  installed,
  settings,
}: InstalledIntegrationInfoProps) => {
  const { id: workspaceId } = useWorkspace();
  const [closedWonDealStageId, setClosedWonDealStageId] = useState(
    (settings as any)?.closedWonDealStageId ||
      HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID,
  );

  const { executeAsync, isPending } = useAction(updateHubSpotSettingsAction, {
    async onSuccess() {
      toast.success("HubSpot settings updated successfully.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update HubSpot settings.");
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspaceId) {
      return;
    }

    await executeAsync({
      workspaceId,
      closedWonDealStageId: closedWonDealStageId || null,
    });
  };

  if (!installed) {
    return null;
  }

  return (
    <form className="mt-4 flex items-end gap-2" onSubmit={onSubmit}>
      <div className="w-full rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">
            Closed Won Deal Stage ID
          </p>
        </div>

        <div className="p-4">
          <p className="text-sm leading-normal text-neutral-600">
            Enter the HubSpot deal stage ID that represents a closed won deal.
            This will be used to track when deals are marked as closed won in
            HubSpot.
          </p>

          <div className="relative mt-4 rounded-md shadow-sm">
            <input
              className="w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder={`Enter deal stage ID (e.g., ${HUBSPOT_DEFAULT_CLOSED_WON_DEAL_STAGE_ID})`}
              type="text"
              autoComplete="off"
              name="closedWonDealStageId"
              value={closedWonDealStageId}
              onChange={(e) => setClosedWonDealStageId(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="shrink-0">
            <Button
              type="submit"
              variant="primary"
              text="Save changes"
              className="h-8 w-fit"
              loading={isPending}
            />
          </div>
        </div>
      </div>
    </form>
  );
};
