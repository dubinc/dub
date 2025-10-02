import { deactivatePartnerAction } from "@/lib/actions/partners/deactivate-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
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

type DeactivatePartnerFormData = {
  confirm: string;
};

function DeactivatePartnerModal({
  showDeactivatePartnerModal,
  setShowDeactivatePartnerModal,
  partner,
}: {
  showDeactivatePartnerModal: boolean;
  setShowDeactivatePartnerModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DeactivatePartnerFormData>({
    defaultValues: {
      confirm: "",
    },
  });

  const [confirm] = watch(["confirm"]);

  const { executeAsync, isPending } = useAction(deactivatePartnerAction, {
    onSuccess: async () => {
      toast.success("Partner deactivated successfully!");
      setShowDeactivatePartnerModal(false);
      mutatePrefix("/api/partners");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = useCallback(async () => {
    if (!workspaceId || !partner.id) {
      return;
    }

    await executeAsync({
      workspaceId,
      partnerId: partner.id,
    });
  }, [executeAsync, partner.id, workspaceId]);

  const isDisabled = useMemo(() => {
    return (
      !workspaceId || !partner.id || confirm !== "confirm deactivate partner"
    );
  }, [workspaceId, partner.id, confirm]);

  return (
    <Modal
      showModal={showDeactivatePartnerModal}
      setShowModal={setShowDeactivatePartnerModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-10">
        <img
          src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
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
          This will deactivate the partner and disable all their active links.
          Their commissions and payouts will remain intact. You can reactivate
          them later if needed.{" "}
          <span className="font-semibold">
            Are you sure you want to continue?
          </span>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 bg-neutral-50 px-4 py-8 text-left sm:rounded-b-2xl sm:px-12"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-neutral-900">
              To verify, type <strong>confirm deactivate partner</strong> below
            </h2>
          </label>
          <div className="relative mt-2 rounded-md shadow-sm">
            <input
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                errors.confirm && "border-red-600",
              )}
              placeholder="confirm deactivate partner"
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
          text="Confirm deactivate"
          disabled={isDisabled}
          loading={isPending}
        />
      </form>
    </Modal>
  );
}

export function useDeactivatePartnerModal({
  partner,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const [showDeactivatePartnerModal, setShowDeactivatePartnerModal] =
    useState(false);

  const DeactivatePartnerModalCallback = useCallback(() => {
    return (
      <DeactivatePartnerModal
        showDeactivatePartnerModal={showDeactivatePartnerModal}
        setShowDeactivatePartnerModal={setShowDeactivatePartnerModal}
        partner={partner}
      />
    );
  }, [showDeactivatePartnerModal, setShowDeactivatePartnerModal, partner]);

  return useMemo(
    () => ({
      setShowDeactivatePartnerModal,
      DeactivatePartnerModal: DeactivatePartnerModalCallback,
    }),
    [setShowDeactivatePartnerModal, DeactivatePartnerModalCallback],
  );
}
