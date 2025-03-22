import { banPartnerAction } from "@/lib/actions/partners/ban-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import {
  BAN_PARTNER_REASONS,
  banPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { Button, Modal } from "@dub/ui";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
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

type BanPartnerFormData = z.infer<typeof banPartnerSchema> & {
  confirm: string;
};

function BanPartnerModal({
  showBanPartnerModal,
  setShowBanPartnerModal,
  partner,
}: {
  showBanPartnerModal: boolean;
  setShowBanPartnerModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const { id: workspaceId } = useWorkspace();
  const { programId } = useParams<{ programId: string }>();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BanPartnerFormData>({
    defaultValues: {
      reason: "tos_violation",
      confirm: "",
    },
  });

  const [reason, confirm] = watch(["reason", "confirm"]);

  const { executeAsync, isPending } = useAction(banPartnerAction, {
    onSuccess: async () => {
      toast.success("Partner banned successfully!");
      setShowBanPartnerModal(false);
      mutatePrefix("/api/partners");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = useCallback(
    async (data: BanPartnerFormData) => {
      if (!workspaceId || !programId || !partner.id) {
        return;
      }

      await executeAsync({
        ...data,
        workspaceId,
        programId,
        partnerId: partner.id,
      });
    },
    [executeAsync, partner.id, programId, workspaceId],
  );

  const isDisabled = useMemo(() => {
    return (
      !workspaceId ||
      !programId ||
      !partner.id ||
      confirm !== `confirm ban ${partner.name}`
    );
  }, [workspaceId, programId, partner.id, reason, confirm]);

  return (
    <Modal
      showModal={showBanPartnerModal}
      setShowModal={setShowBanPartnerModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-10">
        <img
          src={partner.image || `${DICEBEAR_AVATAR_URL}${partner.name}`}
          alt={partner.name}
          className="size-12 rounded-full"
        />

        <div className="flex flex-col text-center">
          <h3 className="text-lg font-semibold leading-7">{partner.name}</h3>
          <p className="text-sm font-medium leading-5 text-neutral-500">
            {partner.email}
          </p>
        </div>

        <p className="text-balance text-center text-sm font-normal leading-5 text-neutral-600">
          This will permanently ban the partner, disable all their active links,
          and cancel all pending payouts. This action is not reversible.{" "}
          <span className="font-semibold">
            Are you sure you want to continue?
          </span>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 bg-neutral-50 px-4 py-8 text-left sm:rounded-b-2xl sm:px-12"
      >
        <div>
          <label htmlFor="reason" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">Ban reason</h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
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
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              To verify, type <strong>confirm ban {partner.name}</strong> below
            </h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                errors.confirm && "border-red-600",
              )}
              placeholder={`confirm ban ${partner.name}`}
              type="text"
              autoComplete="off"
              {...register("confirm", {
                required: true,
              })}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          variant="danger"
          text="Confirm ban"
          disabled={isDisabled}
          loading={isPending}
        />
      </form>
    </Modal>
  );
}

export function useBanPartnerModal({
  partner,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const [showBanPartnerModal, setShowBanPartnerModal] = useState(false);

  const BanPartnerModalCallback = useCallback(() => {
    return (
      <BanPartnerModal
        showBanPartnerModal={showBanPartnerModal}
        setShowBanPartnerModal={setShowBanPartnerModal}
        partner={partner}
      />
    );
  }, [showBanPartnerModal, setShowBanPartnerModal, partner]);

  return useMemo(
    () => ({
      setShowBanPartnerModal,
      BanPartnerModal: BanPartnerModalCallback,
    }),
    [setShowBanPartnerModal, BanPartnerModalCallback],
  );
}
