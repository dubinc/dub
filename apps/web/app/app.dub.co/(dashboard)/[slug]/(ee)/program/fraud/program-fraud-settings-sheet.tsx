"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { FraudRuleProps, UpdateFraudRuleSettings } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { Button, Sheet } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
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
    workspaceId ? `/api/fraud-rules?workspaceId=${workspaceId}` : null,
    fetcher,
  );

  console.log(fraudRules)

  const referralSourceBannedRule = fraudRules?.find(
    (rule) => rule.type === "referralSourceBanned",
  );

  const form = useForm<UpdateFraudRuleSettings>({
    defaultValues: {
      referralSourceBanned: {
        enabled: referralSourceBannedRule?.enabled ?? false,
        config: referralSourceBannedRule?.config ?? { domains: [] },
      },

      paidTrafficDetected: {
        enabled: false,
        config: {
          platforms: [],
        },
      },
    },
  });

  const {
    handleSubmit,
    formState: { isDirty },
  } = form;

  const onSubmit = async (body: UpdateFraudRuleSettings) => {
    await makeRequest("/api/fraud-rules", {
      method: "PATCH",
      body,
      onSuccess: () => {
        toast.success("Fraud settings updated successfully.");
        setIsOpen(false);
        mutatePrefix("/api/fraud-rules");
      },
    });
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
          <div className="flex h-16 items-center justify-between px-6 py-4">
            <Sheet.Title className="text-lg font-semibold">
              Fraud settings
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
          <div className="space-y-8">
            <FraudReferralSourceSettings />
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
