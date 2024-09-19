import useWorkspace from "@/lib/swr/use-workspace";
import { Invite } from "@/lib/zod/schemas/invites";
import { BlurImage, Logo, Modal } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/src/icons";
import { fetcher } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import { InviteTeammatesForm } from "../workspaces/invite-teammates-form";

function InviteTeammateModal({
  showInviteTeammateModal,
  setShowInviteTeammateModal,
  showSavedInvites,
}: {
  showInviteTeammateModal: boolean;
  setShowInviteTeammateModal: Dispatch<SetStateAction<boolean>>;
  showSavedInvites: boolean;
}) {
  const { id: workspaceId, plan, logo } = useWorkspace();

  // we only need to fetch saved invites if the workspace is on the free plan
  // (or else we would've already sent the invites)
  const { data: invites, isLoading } = useSWR<Invite[]>(
    showInviteTeammateModal &&
      workspaceId &&
      plan === "free" &&
      showSavedInvites &&
      `/api/workspaces/${workspaceId}/invites/saved`,
    fetcher,
  );

  return (
    <Modal
      showModal={showInviteTeammateModal}
      setShowModal={setShowInviteTeammateModal}
    >
      <div className="scrollbar-hide h-fit max-h-[95dvh] overflow-y-auto">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          {logo ? (
            <BlurImage
              src={logo}
              alt="Invite Teammates"
              className="h-10 w-10 rounded-full"
              width={20}
              height={20}
            />
          ) : (
            <Logo />
          )}
          <h3 className="text-lg font-medium">Invite Teammates</h3>
          <p className="text-center text-sm text-gray-500">
            Invite teammates with{" "}
            <a
              href="https://dub.co/help/article/workspace-roles"
              target="_blank"
              className="underline hover:text-gray-900"
            >
              different roles and permissions
            </a>
            . Invitations will be valid for 14 days.
          </p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner />
          </div>
        ) : (
          <InviteTeammatesForm
            onSuccess={() => setShowInviteTeammateModal(false)}
            className="bg-gray-50 px-4 py-8 sm:px-16"
            invites={invites}
          />
        )}
      </div>
    </Modal>
  );
}

export function useInviteTeammateModal({
  showSavedInvites = false,
}: {
  showSavedInvites?: boolean;
} = {}) {
  const [showInviteTeammateModal, setShowInviteTeammateModal] = useState(false);

  const InviteTeammateModalCallback = useCallback(() => {
    return (
      <InviteTeammateModal
        showInviteTeammateModal={showInviteTeammateModal}
        setShowInviteTeammateModal={setShowInviteTeammateModal}
        showSavedInvites={showSavedInvites}
      />
    );
  }, [showInviteTeammateModal, setShowInviteTeammateModal, showSavedInvites]);

  return useMemo(
    () => ({
      setShowInviteTeammateModal,
      InviteTeammateModal: InviteTeammateModalCallback,
    }),
    [setShowInviteTeammateModal, InviteTeammateModalCallback],
  );
}
