"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import useWorkspace from "@/lib/swr/use-workspace";
import { InstalledIntegrationInfoProps } from "@/lib/types";
import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { AnimatedSizeContainer, Button, InfoTooltip, Switch } from "@dub/ui";
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
  const { id: workspaceId, role } = useWorkspace();
  const { error: permissionsError } = clientAccessCheck({
    action: "integrations.write",
    role,
  });

  const stripeSettings = stripeIntegrationSettingsSchema.parse({
    ...STRIPE_DEFAULT_SETTINGS,
    ...(settings as z.infer<typeof stripeIntegrationSettingsSchema>),
  });

  const initialFreeTrialsEnabled = stripeSettings?.freeTrials?.enabled ?? false;
  const initialTrackQuantity =
    stripeSettings?.freeTrials?.trackQuantity ?? false;
  const initialFirstTimeTransaction =
    stripeSettings.discountCodeRestrictions.firstTimeTransaction;

  // Track saved values that can be updated after successful save
  const [savedFreeTrialsEnabled, setSavedFreeTrialsEnabled] = useState(
    initialFreeTrialsEnabled,
  );
  const [savedTrackQuantity, setSavedTrackQuantity] =
    useState(initialTrackQuantity);
  const [savedFirstTimeTransaction, setSavedFirstTimeTransaction] = useState(
    initialFirstTimeTransaction,
  );

  const [freeTrialsEnabled, setFreeTrialsEnabled] = useState(
    initialFreeTrialsEnabled,
  );

  const [trackQuantity, setTrackQuantity] = useState(initialTrackQuantity);
  const [firstTimeTransaction, setFirstTimeTransaction] = useState(
    initialFirstTimeTransaction,
  );

  const isDirty = useMemo(() => {
    return (
      freeTrialsEnabled !== savedFreeTrialsEnabled ||
      (freeTrialsEnabled ? trackQuantity : false) !== savedTrackQuantity ||
      firstTimeTransaction !== savedFirstTimeTransaction
    );
  }, [
    freeTrialsEnabled,
    savedFreeTrialsEnabled,
    trackQuantity,
    savedTrackQuantity,
    firstTimeTransaction,
    savedFirstTimeTransaction,
  ]);

  const { executeAsync, isPending } = useAction(updateStripeSettingsAction, {
    async onSuccess() {
      // Update saved values to match current values after successful save
      setSavedFreeTrialsEnabled(freeTrialsEnabled);
      setSavedTrackQuantity(freeTrialsEnabled ? trackQuantity : false);
      setSavedFirstTimeTransaction(firstTimeTransaction);
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
      discountCodeRestrictions: {
        firstTimeTransaction,
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

          <div className="border-t border-neutral-200">
            <div className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1">
                  <label className="text-sm font-semibold text-neutral-900">
                    Discounts eligible for first-time order only
                  </label>
                  <InfoTooltip content="Changes will only take effect for future discount codes." />
                </div>
                <MarkdownDescription className="text-sm text-neutral-600">
                  Whether to restrict discount codes to [first-time
                  orders](https://docs.stripe.com/payments/advanced/discounts#limit-by-first-time-order)
                  only.
                </MarkdownDescription>
              </div>
              <Switch
                checked={firstTimeTransaction}
                fn={setFirstTimeTransaction}
                disabled={isPending}
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
              disabled={!isDirty || isPending || Boolean(permissionsError)}
              {...(permissionsError && {
                disabledTooltip: permissionsError,
              })}
            />
          </div>
        </div>
      </div>
    </form>
  );
};
