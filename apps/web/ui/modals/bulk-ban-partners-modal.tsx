import { bulkBanPartnersAction } from "@/lib/actions/partners/bulk-ban-partners";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import {
  BAN_PARTNER_REASONS,
  bulkBanPartnersSchema,
} from "@/lib/zod/schemas/partners";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL, pluralize } from "@dub/utils";
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
import { z } from "zod";

type BulkBanPartnersFormData = z.infer<typeof bulkBanPartnersSchema> & {
  confirm: string;
};

interface BulkBanPartnersProps {
  showBulkBanPartnersModal: boolean;
  setShowBulkBanPartnersModal: Dispatch<SetStateAction<boolean>>;
  partners: Pick<EnrolledPartnerProps, "id" | "name" | "image" | "email">[];
  onConfirm?: () => Promise<void>;
}

function BulkBanPartnersModal({
  showBulkBanPartnersModal,
  setShowBulkBanPartnersModal,
  partners,
  onConfirm,
}: BulkBanPartnersProps) {
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<BulkBanPartnersFormData>({
    defaultValues: {
      reason: "tos_violation",
      confirm: "",
    },
  });

  const [confirm] = watch(["confirm"]);

  const { executeAsync, isPending } = useAction(bulkBanPartnersAction, {
    onSuccess: async () => {
      await onConfirm?.();
      toast.success(
        `${partnerWord.charAt(0).toUpperCase() + partnerWord.slice(1)} banned successfully!`,
      );
      setShowBulkBanPartnersModal(false);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = useCallback(
    async (data: BulkBanPartnersFormData) => {
      if (!workspaceId || partners.length === 0) {
        return;
      }

      await executeAsync({
        ...data,
        workspaceId,
        partnerIds: partners.map((p) => p.id),
      });
    },
    [executeAsync, partners, workspaceId],
  );

  const partnerWord = pluralize("partner", partners.length);
  const confirmationText = `confirm ban ${partnerWord}`;

  const isDisabled = useMemo(() => {
    return (
      !workspaceId || partners.length === 0 || confirm !== confirmationText
    );
  }, [workspaceId, partners.length, confirm, confirmationText]);

  return (
    <Modal
      showModal={showBulkBanPartnersModal}
      setShowModal={setShowBulkBanPartnersModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Ban {partnerWord}</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            {partners.length === 1 ? (
              <div className="flex items-center gap-4">
                <img
                  src={
                    partners[0].image || `${OG_AVATAR_URL}${partners[0].name}`
                  }
                  alt={partners[0].name}
                  className="size-10 rounded-full bg-white"
                />
                <div className="flex min-w-0 flex-col">
                  <h4 className="truncate text-sm font-medium text-neutral-900">
                    {partners[0].name}
                  </h4>
                  {partners[0].email && (
                    <p className="truncate text-xs text-neutral-500">
                      {partners[0].email}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  {partners.slice(0, 3).map((partner, index) => (
                    <img
                      key={partner.id}
                      src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                      alt={partner.name}
                      className={cn(
                        "inline-block size-7 rounded-full border-2 border-neutral-100 bg-white",
                        index > 0 && "-ml-2.5",
                      )}
                    />
                  ))}
                </div>
                <span className="text-base font-semibold text-neutral-900">
                  {partners.length} partners selected
                </span>
              </div>
            )}
          </div>

          <p className="text-sm text-neutral-600">
            This will permanently ban the {partnerWord}, disable all their
            active links, and cancel all pending payouts. This action is not
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
            <label className="block text-sm font-medium text-neutral-900">
              To verify, type <strong>{confirmationText}</strong> below
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <input
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.confirm && "border-red-600",
                )}
                placeholder={confirmationText}
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
            onClick={() => setShowBulkBanPartnersModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            type="submit"
            variant="danger"
            text={`Ban ${partnerWord}`}
            disabled={isDisabled}
            loading={isPending || isSubmitting || isSubmitSuccessful}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useBulkBanPartnersModal({
  partners,
  onConfirm,
}: {
  partners: Pick<EnrolledPartnerProps, "id" | "name" | "image" | "email">[];
  onConfirm?: () => Promise<void>;
}) {
  const [showBulkBanPartnersModal, setShowBulkBanPartnersModal] =
    useState(false);

  const BulkBanPartnersModalCallback = useCallback(() => {
    return (
      <BulkBanPartnersModal
        showBulkBanPartnersModal={showBulkBanPartnersModal}
        setShowBulkBanPartnersModal={setShowBulkBanPartnersModal}
        partners={partners}
        onConfirm={onConfirm}
      />
    );
  }, [
    showBulkBanPartnersModal,
    setShowBulkBanPartnersModal,
    partners,
    onConfirm,
  ]);

  return useMemo(
    () => ({
      setShowBulkBanPartnersModal,
      BulkBanPartnersModal: BulkBanPartnersModalCallback,
    }),
    [setShowBulkBanPartnersModal, BulkBanPartnersModalCallback],
  );
}
