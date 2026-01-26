"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { AnimatedSizeContainer, Button, Switch } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as z from "zod/v4";
import { stripeIntegrationSettingsSchema } from "../schema";
import { updateStripeSettingsAction } from "../update-stripe-settings";

const STRIPE_DEFAULT_SETTINGS = {
  freeTrials: {
    enabled: false,
    trackQuantity: false,
  },
};

export const StripeIntegrationSettings = ({
  installed,
  settings,
}: InstalledIntegrationInfoProps) => {
  const { id: workspaceId } = useWorkspace();

  const stripeSettings = stripeIntegrationSettingsSchema.parse({
    ...STRIPE_DEFAULT_SETTINGS,
    ...(settings as z.infer<typeof stripeIntegrationSettingsSchema>),
  });

  const initialFreeTrialsEnabled = stripeSettings?.freeTrials?.enabled ?? false;
  const initialTrackQuantity =
    stripeSettings?.freeTrials?.trackQuantity ?? false;

  // Track saved values that can be updated after successful save
  const [savedFreeTrialsEnabled, setSavedFreeTrialsEnabled] = useState(
    initialFreeTrialsEnabled,
  );
  const [savedTrackQuantity, setSavedTrackQuantity] =
    useState(initialTrackQuantity);

  const [freeTrialsEnabled, setFreeTrialsEnabled] = useState(
    initialFreeTrialsEnabled,
  );

  const [trackQuantity, setTrackQuantity] = useState(initialTrackQuantity);

  const isDirty = useMemo(() => {
    return (
      freeTrialsEnabled !== savedFreeTrialsEnabled ||
      trackQuantity !== savedTrackQuantity
    );
  }, [
    freeTrialsEnabled,
    savedFreeTrialsEnabled,
    trackQuantity,
    savedTrackQuantity,
  ]);

  const { executeAsync, isPending } = useAction(updateStripeSettingsAction, {
    async onSuccess() {
      // Update saved values to match current values after successful save
      setSavedFreeTrialsEnabled(freeTrialsEnabled);
      setSavedTrackQuantity(freeTrialsEnabled ? trackQuantity : false);
      toast.success("Stripe settings updated successfully.");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update Stripe settings.");
    },
  });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!workspaceId) {
      return;
    }

    await executeAsync({
      workspaceId,
      freeTrials: {
        enabled: freeTrialsEnabled,
        trackQuantity: freeTrialsEnabled ? trackQuantity : false,
      },
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
            Stripe Integration Settings
          </p>
        </div>

        <div className="space-y-0">
          <div className="flex items-center justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-sm font-semibold text-neutral-900">
                Track Free Trials
              </label>
              <MarkdownDescription className="text-sm text-neutral-600">
                Whether to track [subscription free
                trials](https://docs.stripe.com/billing/subscriptions/trials) as
                lead events.
              </MarkdownDescription>
            </div>
            <Switch
              checked={freeTrialsEnabled}
              fn={setFreeTrialsEnabled}
              disabled={isPending}
            />
          </div>

          <AnimatedSizeContainer height>
            {freeTrialsEnabled && (
              <div className="border-t border-neutral-200">
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-sm font-semibold text-neutral-900">
                      Track Provisioned Quantity
                    </label>
                    <MarkdownDescription className="text-sm text-neutral-600">
                      Whether to track the [provisioned
                      quantity](https://docs.stripe.com/billing/subscriptions/quantities)
                      in the subscription as separate lead events.
                    </MarkdownDescription>
                  </div>
                  <Switch
                    checked={trackQuantity}
                    fn={setTrackQuantity}
                    disabled={isPending}
                  />
                </div>
              </div>
            )}
          </AnimatedSizeContainer>
        </div>

        <div className="flex items-center justify-end rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="shrink-0">
            <Button
              type="submit"
              variant="primary"
              text="Save changes"
              className="h-8 w-fit"
              loading={isPending}
              disabled={!isDirty || isPending}
            />
          </div>
        </div>
      </div>
    </form>
  );
};
