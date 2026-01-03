"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { Button, CardSelector } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod/v4";
import {
  HUBSPOT_DEFAULT_SETTINGS,
  LEAD_TRIGGER_EVENT_OPTIONS,
} from "../constants";
import { hubSpotSettingsSchema } from "../schema";
import { updateHubSpotSettingsAction } from "../update-hubspot-settings";

export const HubSpotSettings = ({
  installed,
  settings,
}: InstalledIntegrationInfoProps) => {
  const { id: workspaceId } = useWorkspace();

  const hubSpotSettings = hubSpotSettingsSchema.parse({
    ...HUBSPOT_DEFAULT_SETTINGS,
    ...(settings as z.infer<typeof hubSpotSettingsSchema>),
  });

  const [leadTriggerEvent, setLeadTriggerEvent] = useState(
    hubSpotSettings.leadTriggerEvent,
  );

  const [leadLifecycleStageId, setLeadLifecycleStageId] = useState(
    hubSpotSettings.leadLifecycleStageId,
  );

  const [closedWonDealStageId, setClosedWonDealStageId] = useState(
    hubSpotSettings.closedWonDealStageId,
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
      leadTriggerEvent,
      leadLifecycleStageId,
      closedWonDealStageId,
    });
  };

  if (!installed) {
    return null;
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-x-2 border-b border-neutral-200 px-4 py-4">
          <p className="text-sm font-medium text-neutral-700">
            HubSpot Integration Settings
          </p>
        </div>

        <div className="space-y-6 p-4">
          <div>
            <p className="mb-4 text-sm leading-normal text-neutral-600">
              Choose when leads should be tracked in Dub. This determines the
              trigger event for lead attribution.
            </p>

            <CardSelector
              options={[
                {
                  key: "dealCreated",
                  label: "New Deal Created",
                  description: "Track leads when deals are created",
                },
                {
                  key: "lifecycleStageReached",
                  label: "Lifecycle Stage Reached",
                  description: "Track leads at specific lifecycle stages",
                },
              ]}
              value={leadTriggerEvent ?? undefined}
              onChange={(value) => {
                const newValue =
                  value as (typeof LEAD_TRIGGER_EVENT_OPTIONS)[number];

                setLeadTriggerEvent(newValue);

                if (newValue === "dealCreated") {
                  setLeadLifecycleStageId(null);
                }
              }}
              gridCols="2"
            />
          </div>

          {leadTriggerEvent === "lifecycleStageReached" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-neutral-700">
                Lead Lifecycle Stage ID
              </label>
              <p className="mb-3 text-sm leading-normal text-neutral-600">
                Enter the HubSpot contact lifecycle stage ID that represents a
                qualified lead. This will be used to track lead when contacts
                reach this lifecycle stage.
              </p>
              <div className="relative rounded-md shadow-sm">
                <input
                  className="w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="customer"
                  type="text"
                  autoComplete="off"
                  name="leadLifecycleStageId"
                  value={leadLifecycleStageId ?? ""}
                  onChange={(e) => setLeadLifecycleStageId(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="border-t border-neutral-200 pt-6">
            <label className="mb-2 block text-sm font-semibold text-neutral-700">
              Closed Won Deal Stage ID
            </label>
            <p className="mb-3 text-sm leading-normal text-neutral-600">
              Enter the HubSpot deal stage ID that represents a closed won deal.
              This will be used to track sale when deals are marked as closed
              won in HubSpot.
            </p>
            <div className="relative rounded-md shadow-sm">
              <input
                className="w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                placeholder="closedwon"
                type="text"
                autoComplete="off"
                name="closedWonDealStageId"
                value={closedWonDealStageId ?? ""}
                onChange={(e) => setClosedWonDealStageId(e.target.value)}
              />
            </div>
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
