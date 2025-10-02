import { unbanPartnerAction } from "@/lib/actions/partners/unban-partner";
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

type UnbanPartnerFormData = {
  confirm: string;
};

function UnbanPartnerModal({
  showUnbanPartnerModal,
  setShowUnbanPartnerModal,
  partner,
}: {
  showUnbanPartnerModal: boolean;
  setShowUnbanPartnerModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UnbanPartnerFormData>({
    defaultValues: {
      confirm: "",
    },
  });

  const [confirm] = watch(["confirm"]);

  const { executeAsync, isPending } = useAction(unbanPartnerAction, {
    onSuccess: async () => {
      toast.success("Partner unbanned successfully!");
      setShowUnbanPartnerModal(false);
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
      !workspaceId || !partner.id || confirm !== `confirm unban ${partner.name}`
    );
  }, [workspaceId, partner.id, confirm]);

  return (
    <Modal
      showModal={showUnbanPartnerModal}
      setShowModal={setShowUnbanPartnerModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Unban partner</h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <div className="flex items-center gap-4">
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name}
                className="size-10 rounded-full bg-white"
              />
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
            This will unban the partner, enable all their active links, and
            restore all pending payouts.
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              To verify, type <strong>confirm unban {partner.name}</strong>{" "}
              below
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <input
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.confirm && "border-red-600",
                )}
                placeholder={`confirm unban ${partner.name}`}
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
            onClick={() => setShowUnbanPartnerModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            type="submit"
            text="Unban partner"
            disabled={isDisabled}
            loading={isPending}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useUnbanPartnerModal({
  partner,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const [showUnbanPartnerModal, setShowUnbanPartnerModal] = useState(false);

  const UnbanPartnerModalCallback = useCallback(() => {
    return (
      <UnbanPartnerModal
        showUnbanPartnerModal={showUnbanPartnerModal}
        setShowUnbanPartnerModal={setShowUnbanPartnerModal}
        partner={partner}
      />
    );
  }, [showUnbanPartnerModal, setShowUnbanPartnerModal, partner]);

  return useMemo(
    () => ({
      setShowUnbanPartnerModal,
      UnbanPartnerModal: UnbanPartnerModalCallback,
    }),
    [setShowUnbanPartnerModal, UnbanPartnerModalCallback],
  );
}
