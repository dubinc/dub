import { parseActionError } from "@/lib/actions/parse-action-errors";
import { updatePartnerEnrollmentAction } from "@/lib/actions/partners/update-partner-enrollment";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  EnrolledPartnerExtendedProps,
  EnrolledPartnerProps,
} from "@/lib/types";
import { Button, CircleInfo, Modal, Switch } from "@dub/ui";
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

type FormData = {
  tenantId: string | null;
  customerDataSharingEnabledAt: Date | null;
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
    "id" | "tenantId" | "customerDataSharingEnabledAt"
  >;
}) {
  const { id: workspaceId } = useWorkspace();

  const [hasCustomerDataSharing, setHasCustomerDataSharing] = useState(
    !!partner.customerDataSharingEnabledAt,
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
    },
  });

  const handleCustomerDataSharingToggle = (checked: boolean) => {
    setHasCustomerDataSharing(checked);
    setValue("customerDataSharingEnabledAt", checked ? new Date() : null, {
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
              <span className="text-sm font-medium text-neutral-800">
                Partner{" "}
                <span className="rounded-md bg-neutral-200 px-1 py-0.5">
                  tenantId
                </span>
              </span>
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
            <div className="flex items-center gap-4">
              <Switch
                fn={handleCustomerDataSharingToggle}
                checked={hasCustomerDataSharing}
                trackDimensions="w-8 h-4"
                thumbDimensions="w-3 h-3"
                thumbTranslate="translate-x-4"
              />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-neutral-700">
                  Enable customer data sharing
                </h3>
                <p className="text-xs text-neutral-500">
                  Allow this partner to access customer data and analytics
                </p>
              </div>
            </div>
          </div>
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
