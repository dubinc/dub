"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudRuleProps, UpdateFraudRuleSettings } from "@/lib/types";
import {
  getRulesBeingDisabled,
  useDisableFraudRulesModal,
} from "@/ui/modals/disable-fraud-rules-modal";
import { X } from "@/ui/shared/icons";
import { Button, InfoTooltip, Sheet } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import { FraudPaidTrafficSettings } from "./fraud-paid-traffic-settings";
import { FraudReferralSourceSettings } from "./fraud-referral-source-settings";

interface ProgramFraudSettingsSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

function ProgramFraudSettingsSheetContent({
  setIsOpen,
}: ProgramFraudSettingsSheetProps) {
  const { id: workspaceId } = useWorkspace();
  const { isSubmitting, makeRequest } = useApiMutation();

  const { data: fraudRules, isLoading } = useSWR<FraudRuleProps[]>(
    workspaceId ? `/api/fraud/rules?workspaceId=${workspaceId}` : null,
    fetcher,
  );

  const { setShowDisableModal, DisableFraudRulesModal } =
    useDisableFraudRulesModal({ setIsOpen });

  const form = useForm<UpdateFraudRuleSettings>({
    defaultValues: {
      referralSourceBanned: {
        enabled: false,
        config: { domains: [] },
      },
      paidTrafficDetected: {
        enabled: false,
        config: { platforms: [] },
      },
    },
  });

  const {
    handleSubmit,
    formState: { isDirty },
  } = form;

  useEffect(() => {
    if (!fraudRules) return;

    const referralSourceBannedRule = fraudRules.find(
      (rule) => rule.type === "referralSourceBanned",
    );

    const paidTrafficDetectedRule = fraudRules.find(
      (rule) => rule.type === "paidTrafficDetected",
    );

    form.reset({
      referralSourceBanned: {
        enabled: referralSourceBannedRule?.enabled ?? false,
        config: referralSourceBannedRule?.config ?? { domains: [] },
      },
      paidTrafficDetected: {
        enabled: paidTrafficDetectedRule?.enabled ?? false,
        config: paidTrafficDetectedRule?.config ?? { platforms: [] },
      },
    });
  }, [fraudRules, form]);

  // Submit form data to API
  const submitForm = async (body: UpdateFraudRuleSettings) => {
    await makeRequest("/api/fraud/rules", {
      method: "PATCH",
      body,
      onSuccess: () => {
        toast.success("Fraud settings updated successfully.");
        setIsOpen(false);
        mutatePrefix(["/api/fraud/rules", "/api/fraud/events"]);
      },
    });
  };

  // Handle form submission
  const onSubmit = async (body: UpdateFraudRuleSettings) => {
    if (isLoading) {
      return;
    }

    // First submit if no previous data exists
    if (!fraudRules) {
      await submitForm(body);
      return;
    }

    // Detect rule disable transitions
    const rulesBeingDisabled = getRulesBeingDisabled({
      previousFraudRules: fraudRules,
      nextFraudRules: body,
    });

    // If any rules are being disabled, show confirmation modal
    if (rulesBeingDisabled.length > 0) {
      setShowDisableModal(true);
      return;
    }

    // Otherwise, submit directly
    await submitForm(body);
  };

  return (
    <>
      <FormProvider {...form}>
        {DisableFraudRulesModal}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
            <div className="flex h-16 items-center justify-between px-6 py-4">
              <Sheet.Title className="flex items-center gap-2 text-lg font-semibold">
                Fraud settings
                <InfoTooltip
                  content={
                    "Learn more about our fraud and risk flags, including how to configure them. [Learn more.](https://dub.co/help/article/fraud-and-risk-flags)"
                  }
                />
              </Sheet.Title>
              <Sheet.Close asChild>
                <Button
                  variant="outline"
                  icon={<X className="size-5" />}
                  className="h-auto w-fit p-1"
                />
              </Sheet.Close>
            </div>
          </div>

          <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              <FraudPaidTrafficSettings isConfigLoading={isLoading} />
              <FraudReferralSourceSettings isConfigLoading={isLoading} />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
            <div className="flex items-center justify-end gap-2 p-5">
              <Button
                variant="secondary"
                text="Cancel"
                disabled={isSubmitting}
                className="h-8 w-fit px-3"
                onClick={() => setIsOpen(false)}
              />

              <Button
                type="submit"
                text="Save"
                className="h-8 w-fit px-3"
                loading={isSubmitting}
                disabled={!isDirty || isLoading}
              />
            </div>
          </div>
        </form>
      </FormProvider>
    </>
  );
}

function ProgramFraudSettingsSheet({
  isOpen,
  ...rest
}: ProgramFraudSettingsSheetProps & {
  isOpen: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen}>
      <ProgramFraudSettingsSheetContent {...rest} />
    </Sheet>
  );
}

export function useProgramFraudSettingsSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    programFraudSettingsSheet: (
      <ProgramFraudSettingsSheet setIsOpen={setIsOpen} isOpen={isOpen} />
    ),
    setIsOpen,
  };
}
