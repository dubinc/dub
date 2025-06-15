import { disableTwoFactorAuthAction } from "@/lib/actions/auth/disable-two-factor-auth";
import useUser from "@/lib/swr/use-user";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

interface DisableTwoFactorAuthModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const DisableTwoFactorAuthModal = ({
  showModal,
  setShowModal,
}: DisableTwoFactorAuthModalProps) => {
  const { mutate } = useUser();

  const { executeAsync: disable2FA, isPending: isDisabling } = useAction(
    disableTwoFactorAuthAction,
    {
      onSuccess: () => {
        toast.success("Two-factor authentication disabled successfully!");
        setShowModal(false);
        mutate();
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">
          Disable Two-factor Authentication
        </h3>
        <p className="text-sm text-neutral-500">
          Are you sure you want to disable two-factor authentication? Your
          one-time codes will no longer be valid and your recovery codes will be
          deleted.
        </p>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            disable2FA();
          }}
        >
          <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isDisabling}
            />

            <Button
              type="submit"
              text="Confirm disable"
              variant="danger"
              loading={isDisabling}
              className="h-9 w-fit"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useDisableTwoFactorAuthModal() {
  const [showDisableTwoFactorAuthModal, setShowDisableTwoFactorAuthModal] =
    useState(false);

  const DisableTwoFactorAuthModalCallback = useCallback(() => {
    return (
      <DisableTwoFactorAuthModal
        showModal={showDisableTwoFactorAuthModal}
        setShowModal={setShowDisableTwoFactorAuthModal}
      />
    );
  }, [showDisableTwoFactorAuthModal, setShowDisableTwoFactorAuthModal]);

  return useMemo(
    () => ({
      setShowDisableTwoFactorAuthModal,
      DisableTwoFactorAuthModal: DisableTwoFactorAuthModalCallback,
    }),
    [setShowDisableTwoFactorAuthModal, DisableTwoFactorAuthModalCallback],
  );
}
