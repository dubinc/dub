import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import BlurImage from "#/ui/blur-image";
import Modal from "@/components/shared/modal";
import useProject from "#/lib/swr/use-project";
import { toast } from "sonner";
import Button from "#/ui/button";
import { UserProps } from "#/lib/types";

function RemoveTeammateModal({
  showRemoveTeammateModal,
  setShowRemoveTeammateModal,
  user,
  invite,
}: {
  showRemoveTeammateModal: boolean;
  setShowRemoveTeammateModal: Dispatch<SetStateAction<boolean>>;
  user: UserProps;
  invite?: boolean;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const [removing, setRemoving] = useState(false);
  const { logo } = useProject();
  const { id, name, email, image } = user;

  return (
    <Modal
      showModal={showRemoveTeammateModal}
      setShowModal={setShowRemoveTeammateModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          <BlurImage
            src={logo || `/_static/logo.png`}
            alt="Remove Teammate"
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Remove Teammate</h3>
          <p className="text-center text-sm text-gray-500">
            This will remove{" "}
            <span className="font-semibold text-black">{name || email}</span>
            {invite
              ? "'s invitation to join your project."
              : " from your project. Are you sure you want to continue?"}
          </p>
        </div>

        <div className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 text-left sm:px-16">
          <div className="flex items-center space-x-3 rounded-md border border-gray-300 bg-white p-3">
            <BlurImage
              src={
                image || `https://avatars.dicebear.com/api/micah/${email}.svg`
              }
              alt={email}
              width={40}
              height={40}
              className="overflow-hidden rounded-full border border-gray-200"
            />
            <div className="flex flex-col">
              <h3 className="text-sm font-medium">{name || email}</h3>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          </div>
          <Button
            text="Confirm remove"
            variant="danger"
            loading={removing}
            onClick={() => {
              setRemoving(true);
              fetch(
                `/api/projects/${slug}/${
                  invite ? `invites?email=${email}` : `users?userId=${id}`
                }`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                },
              ).then(async (res) => {
                setRemoving(false);
                if (res.status === 200) {
                  toast.success(
                    `${invite ? "Invite" : "User"} removed from project!`,
                  );
                  mutate(
                    `/api/projects/${slug}/${invite ? "invites" : "users"}`,
                  );
                  setShowRemoveTeammateModal(false);
                } else {
                  const error = await res.text();
                  toast.error(error);
                }
              });
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useRemoveTeammateModal({
  user,
  invite,
}: {
  user: UserProps;
  invite?: boolean;
}) {
  const [showRemoveTeammateModal, setShowRemoveTeammateModal] = useState(false);

  const RemoveTeammateModalCallback = useCallback(() => {
    return (
      <RemoveTeammateModal
        showRemoveTeammateModal={showRemoveTeammateModal}
        setShowRemoveTeammateModal={setShowRemoveTeammateModal}
        user={user}
        invite={invite}
      />
    );
  }, [showRemoveTeammateModal, setShowRemoveTeammateModal]);

  return useMemo(
    () => ({
      setShowRemoveTeammateModal,
      RemoveTeammateModal: RemoveTeammateModalCallback,
    }),
    [setShowRemoveTeammateModal, RemoveTeammateModalCallback],
  );
}
