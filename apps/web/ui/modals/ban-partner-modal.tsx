import { banPartnerAction } from "@/lib/actions/partners/ban-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import {
  BAN_PARTNER_REASONS,
  MAX_FRAUD_REASON_LENGTH,
  banPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Modal, Switch } from "@dub/ui";
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
import * as z from "zod/v4";

type BanPartnerFormData = z.infer<typeof banPartnerSchema> & {
  confirm: string;
};

function BanPartnerModal({
  showBanPartnerModal,
  setShowBanPartnerModal,
  partner,
  onConfirm,
}: {
  showBanPartnerModal: boolean;
  setShowBanPartnerModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  onConfirm?: () => Promise<void>;
}) {
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<BanPartnerFormData>({
    defaultValues: {
      reason: "tos_violation",
      flagForFraud: false,
      fraudReason: "",
      confirm: "",
    },
  });

  const confirm = watch("confirm");
  const flagForFraud = watch("flagForFraud");

  const { executeAsync, isPending } = useAction(banPartnerAction, {
    onSuccess: async () => {
      await onConfirm?.();
      toast.success("Partner banned successfully!");
      setShowBanPartnerModal(false);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = useCallback(
    async (data: BanPartnerFormData) => {
      if (!workspaceId || !partner.id) {
        return;
      }

      await executeAsync({
        ...data,
        workspaceId,
        partnerId: partner.id,
      });
    },
    [executeAsync, partner.id, workspaceId],
  );

  const isDisabled = useMemo(() => {
    return !workspaceId || !partner.id || confirm !== "confirm ban partner";
  }, [workspaceId, partner.id, confirm]);

  return (
    <Modal
      showModal={showBanPartnerModal}
      setShowModal={setShowBanPartnerModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Ban partner</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <div className="flex items-center gap-4">
              <PartnerAvatar partner={partner} className="size-10 bg-white" />
              <div className="flex min-w-0 flex-col">
                <h4 className="truncate text-sm font-medium text-neutral-900">
                  {partner.name}
                </h4>
                <p className="truncate text-xs text-neutral-500">
                  {partner.email}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-neutral-600">
            This will permanently ban the partner, disable all their active
            links, and cancel all pending payouts. This action is not
            reversible.
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Ban reason
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <select
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.reason && "border-red-600",
                )}
                {...register("reason", {
                  required: true,
                })}
              >
                <option value="" disabled>
                  Select a reason
                </option>
                {Object.entries(BAN_PARTNER_REASONS).map(([key, value]) => (
                  <option value={key} key={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-neutral-900">
                  Flag partner for potential fraud
                </span>
                <p className="mt-0.5 text-xs text-neutral-500">
                  This will send the partner to Dub for review.
                </p>
              </div>
              <Switch
                checked={flagForFraud}
                fn={(checked: boolean) => setValue("flagForFraud", checked)}
              />
            </div>
            {flagForFraud && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-neutral-900">
                  Fraud reason
                </label>
                <textarea
                  className={cn(
                    "mt-1.5 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.fraudReason && "border-red-600",
                  )}
                  placeholder="Describe the suspected fraudulent activity..."
                  rows={3}
                  maxLength={MAX_FRAUD_REASON_LENGTH}
                  {...register("fraudReason", {
                    required: flagForFraud && "Reason is required",
                    maxLength: {
                      value: MAX_FRAUD_REASON_LENGTH,
                      message: `Must be ${MAX_FRAUD_REASON_LENGTH} characters or fewer`,
                    },
                  })}
                />
                {errors.fraudReason && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.fraudReason.message}
                  </p>
                )}
                <MaxCharactersCounter
                  name="fraudReason"
                  maxLength={MAX_FRAUD_REASON_LENGTH}
                  control={control}
                  className="mt-1 block text-right"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              To verify, type <strong>confirm ban partner</strong> below
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <input
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.confirm && "border-red-600",
                )}
                placeholder="confirm ban partner"
                type="text"
                autoComplete="off"
                {...register("confirm", {
                  required: true,
                })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
          <Button
            onClick={() => setShowBanPartnerModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            type="submit"
            variant="danger"
            text="Ban partner"
            disabled={isDisabled}
            loading={isPending || isSubmitting || isSubmitSuccessful}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useBanPartnerModal({
  partner,
  onConfirm,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  onConfirm?: () => Promise<void>;
}) {
  const [showBanPartnerModal, setShowBanPartnerModal] = useState(false);

  const BanPartnerModalCallback = useCallback(() => {
    return (
      <BanPartnerModal
        showBanPartnerModal={showBanPartnerModal}
        setShowBanPartnerModal={setShowBanPartnerModal}
        partner={partner}
        onConfirm={onConfirm}
      />
    );
  }, [showBanPartnerModal, setShowBanPartnerModal, partner, onConfirm]);

  return useMemo(
    () => ({
      setShowBanPartnerModal,
      BanPartnerModal: BanPartnerModalCallback,
    }),
    [setShowBanPartnerModal, BanPartnerModalCallback],
  );
}
