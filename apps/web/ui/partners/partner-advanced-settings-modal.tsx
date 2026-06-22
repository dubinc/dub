import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updatePartnerEnrollmentAction } from "@/lib/actions/partners/update-partner-enrollment";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  EnrolledPartnerExtendedProps,
  EnrolledPartnerProps,
} from "@/lib/types";
import { Button, CircleInfo, InfoTooltip, Modal, Switch } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MarkdownDescription } from "../shared/markdown-description";

type FormData = {
  tenantId: string | null;
  customerDataSharingEnabledAt: Date | null;
  groupMoveDisabledAt: Date | null;
  riskMonitoringDisabledAt: Date | null;
};

function PartnerAdvancedSettingsModal({
  showPartnerAdvancedSettingsModal,
  setShowPartnerAdvancedSettingsModal,
  partner,
}: {
  showPartnerAdvancedSettingsModal: boolean;
  setShowPartnerAdvancedSettingsModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<
    EnrolledPartnerExtendedProps,
    | "id"
    | "tenantId"
    | "customerDataSharingEnabledAt"
    | "groupMoveDisabledAt"
    | "riskMonitoringDisabledAt"
  >;
}) {
  const { id: workspaceId, plan } = useWorkspace();
  const { canUseGroupMoveRule, canManageFraudEvents } =
    getPlanCapabilities(plan);

  const [hasCustomerDataSharing, setHasCustomerDataSharing] = useState(
    !!partner.customerDataSharingEnabledAt,
  );

  const [hasGroupMoveDisabled, setHasGroupMoveDisabled] = useState(
    !!partner.groupMoveDisabledAt,
  );

  const [hasRiskDetectionDisabled, setHasRiskDetectionDisabled] = useState(
    !!partner.riskMonitoringDisabledAt,
  );

  const { executeAsync } = useAction(updatePartnerEnrollmentAction, {
    onSuccess: async () => {
      toast.success(`Partner updated successfully!`);
      setShowPartnerAdvancedSettingsModal(false);
      mutatePrefix("/api/partners");
    },
  });

  const {
    register,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful, isDirty },
  } = useForm<FormData>({
    defaultValues: {
      tenantId: partner.tenantId,
      customerDataSharingEnabledAt: partner.customerDataSharingEnabledAt,
      groupMoveDisabledAt: partner.groupMoveDisabledAt ?? null,
      riskMonitoringDisabledAt: partner.riskMonitoringDisabledAt ?? null,
    },
  });

  const handleCustomerDataSharingToggle = (checked: boolean) => {
    setHasCustomerDataSharing(checked);
    setValue("customerDataSharingEnabledAt", checked ? new Date() : null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleGroupMoveDisabledToggle = (checked: boolean) => {
    setHasGroupMoveDisabled(checked);
    setValue("groupMoveDisabledAt", checked ? new Date() : null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleRiskDetectionDisabledToggle = (checked: boolean) => {
    setHasRiskDetectionDisabled(checked);
    setValue("riskMonitoringDisabledAt", checked ? new Date() : null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <Modal
      showModal={showPartnerAdvancedSettingsModal}
      setShowModal={setShowPartnerAdvancedSettingsModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Edit advanced settings
        </h3>
      </div>

      <form
        onSubmit={handleSubmit(async (data) => {
          const result = await executeAsync({
            workspaceId: workspaceId!,
            partnerId: partner.id,
            tenantId: data.tenantId || null,
            customerDataSharingEnabledAt: data.customerDataSharingEnabledAt,
            groupMoveDisabledAt: data.groupMoveDisabledAt,
            riskMonitoringDisabledAt: data.riskMonitoringDisabledAt,
          });

          if (result?.serverError || result?.validationErrors) {
            setError("root.serverError", {
              message: "Failed to submit application",
            });
            toast.error(parseActionError(result, "Failed to update partner"));
          }
        })}
      >
        <div className="scrollbar-hide max-h-[calc(100dvh-250px)] overflow-y-auto bg-neutral-50 p-4 sm:p-6">
          {/* Tenant ID */}
          <div>
            <label>
              <div className="flex items-center gap-1 text-sm font-medium text-neutral-800">
                Partner{" "}
                <span className="rounded-md bg-neutral-200 px-1 py-0.5">
                  tenantId
                </span>
                <InfoTooltip content="The partner's [unique ID in your system](https://dub.co/docs/api-reference/partners/create#body-tenant-id). Useful for retrieving the partner's links, stats, and other relavant data later on." />
              </div>
              <input
                type="text"
                className={cn(
                  "mt-1.5 block w-full rounded-md border border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.tenantId &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("tenantId")}
                placeholder="partner_123"
              />
            </label>

            <p className="mt-1.5 text-xs text-amber-600">
              <CircleInfo className="mr-1 inline-block size-3 -translate-y-px" />
              This will also update the{" "}
              <span className="rounded-md bg-orange-100 px-1 py-px">
                tenantId
              </span>{" "}
              field for the partner's links
            </p>
          </div>

          {/* Customer Data Sharing */}
          <div className="mt-6">
            <div className="flex items-start gap-3">
              <Switch
                fn={handleCustomerDataSharingToggle}
                checked={hasCustomerDataSharing}
                trackDimensions="w-8 h-4"
                thumbDimensions="w-3 h-3"
                thumbTranslate="translate-x-4"
              />
              <div className="flex flex-col gap-1.5">
                <h3 className="text-sm font-medium leading-none text-neutral-700">
                  Enable customer data sharing
                </h3>
                <p className="text-xs text-neutral-500">
                  Allow this partner to access customer data and analytics
                </p>
              </div>
            </div>
          </div>

          {canUseGroupMoveRule && (
            <div className="mt-6">
              <div className="flex items-start gap-3">
                <Switch
                  fn={handleGroupMoveDisabledToggle}
                  checked={hasGroupMoveDisabled}
                  trackDimensions="w-8 h-4"
                  thumbDimensions="w-3 h-3"
                  thumbTranslate="translate-x-4"
                />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-medium leading-none text-neutral-700">
                    Ignore group move rules
                  </h3>
                  <MarkdownDescription className="text-xs text-neutral-500">
                    When enabled, this partner will remain in their current
                    group and won't be subject to [group move
                    rules](https://dub.co/help/article/partner-groups#group-move-rules).
                  </MarkdownDescription>
                </div>
              </div>
            </div>
          )}

          {canManageFraudEvents && (
            <div className="mt-6">
              <div className="flex items-start gap-3">
                <Switch
                  fn={handleRiskDetectionDisabledToggle}
                  checked={hasRiskDetectionDisabled}
                  trackDimensions="w-8 h-4"
                  thumbDimensions="w-3 h-3"
                  thumbTranslate="translate-x-4"
                />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-medium leading-none text-neutral-700">
                    Exclude from risk monitoring
                  </h3>
                  <MarkdownDescription className="text-xs text-neutral-500">
                    Future [risk
                    events](https://dub.co/help/article/risk-monitoring) won't
                    be detected for this partner.
                  </MarkdownDescription>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowPartnerAdvancedSettingsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            loading={isSubmitting || isSubmitSuccessful}
            text="Save changes"
            className="h-8 w-fit px-3"
            disabled={!isDirty}
          />
        </div>
      </form>
    </Modal>
  );
}

export function usePartnerAdvancedSettingsModal({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  const [
    showPartnerAdvancedSettingsModal,
    setShowPartnerAdvancedSettingsModal,
  ] = useState(false);

  const PartnerAdvancedSettingsModalCallback = useCallback(() => {
    return (
      <PartnerAdvancedSettingsModal
        showPartnerAdvancedSettingsModal={showPartnerAdvancedSettingsModal}
        setShowPartnerAdvancedSettingsModal={
          setShowPartnerAdvancedSettingsModal
        }
        partner={partner}
      />
    );
  }, [
    showPartnerAdvancedSettingsModal,
    setShowPartnerAdvancedSettingsModal,
    partner,
  ]);

  return useMemo(
    () => ({
      setShowPartnerAdvancedSettingsModal,
      PartnerAdvancedSettingsModal: PartnerAdvancedSettingsModalCallback,
    }),
    [setShowPartnerAdvancedSettingsModal, PartnerAdvancedSettingsModalCallback],
  );
}
