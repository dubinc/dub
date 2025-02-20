import useWorkspace from "@/lib/swr/use-workspace";
import { Button, CopyButton, Logo, Modal } from "@dub/ui";
import { APP_DOMAIN } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

function InviteCodeModal({
  showInviteCodeModal,
  setShowInviteCodeModal,
}: {
  showInviteCodeModal: boolean;
  setShowInviteCodeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { id, inviteCode, mutate } = useWorkspace();

  const inviteLink = useMemo(() => {
    return `${APP_DOMAIN}/invites/${inviteCode}`;
  }, [inviteCode]);

  const [resetting, setResetting] = useState(false);

  return (
    <Modal
      showModal={showInviteCodeModal}
      setShowModal={setShowInviteCodeModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Invite Link</h3>
        <p className="text-center text-sm text-neutral-500">
          Allow other people to join your workspace through the link below.
        </p>
      </div>

      <div className="flex flex-col space-y-3 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <div className="flex items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-1.5">
          <p className="scrollbar-hide w-[88%] overflow-scroll font-mono text-xs text-neutral-500">
            {inviteLink}
          </p>
          <CopyButton value={inviteLink} className="rounded-md" />
        </div>
        <Button
          text="Reset invite link"
          variant="secondary"
          loading={resetting}
          onClick={() => {
            setResetting(true);
            fetch(`/api/workspaces/${id}/invites/reset`, {
              method: "POST",
            }).then(async () => {
              await mutate();
              setResetting(false);
            });
          }}
        />
      </div>
    </Modal>
  );
}

export function useInviteCodeModal() {
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);

  const InviteCodeModalCallback = useCallback(() => {
    return (
      <InviteCodeModal
        showInviteCodeModal={showInviteCodeModal}
        setShowInviteCodeModal={setShowInviteCodeModal}
      />
    );
  }, [showInviteCodeModal, setShowInviteCodeModal]);

  return useMemo(
    () => ({
      setShowInviteCodeModal,
      InviteCodeModal: InviteCodeModalCallback,
    }),
    [setShowInviteCodeModal, InviteCodeModalCallback],
  );
}
