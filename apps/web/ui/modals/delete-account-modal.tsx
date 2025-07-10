import useWorkspaces from "@/lib/swr/use-workspaces";
import { Avatar, Button, Modal } from "@dub/ui";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function DeleteAccountModal({
  showDeleteAccountModal,
  setShowDeleteAccountModal,
}: {
  showDeleteAccountModal: boolean;
  setShowDeleteAccountModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const { workspaces } = useWorkspaces();
  const [deleting, setDeleting] = useState(false);

  const userWorkspace = useMemo(() => {
    if (!workspaces) return null;
    return workspaces.find(
      (workspace) => workspace.users?.[0].role === "owner",
    );
  }, [workspaces]);

  async function deleteAccount() {
    return new Promise((resolve, reject) => {
      setDeleting(true);

      const deleteUser = async () => {
        const accountRes = await fetch(`/api/user`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (accountRes.ok) {
          await Promise.all([mutate("/api/workspaces"), update()]);

          await signOut({ redirect: false });

          router.push("/register");

          setShowDeleteAccountModal(false);
          setDeleting(false);
          resolve(null);
        } else {
          const error = await accountRes.text();
          throw new Error(error);
        }
      };

      if (!userWorkspace?.id) {
        deleteUser().catch((error) => {
          setDeleting(false);
          reject(error.message);
        });
        return;
      }

      // If user has a workspace we need to delete it first
      fetch(`/api/workspaces/${userWorkspace.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(async (res) => {
          if (res.ok) {
            try {
              await deleteUser();
            } catch (error) {
              setDeleting(false);
              reject(
                error instanceof Error
                  ? error.message
                  : "Failed to delete account",
              );
            }
          } else {
            setDeleting(false);
            const error = await res.text();
            reject(error);
          }
        })
        .catch((error) => {
          setDeleting(false);
          reject(error.message);
        });
    });
  }

  return (
    <Modal
      showModal={showDeleteAccountModal}
      setShowModal={setShowDeleteAccountModal}
      className="border-border-500"
    >
      <div className="border-border-500 flex flex-col items-center justify-center space-y-3 border-b px-4 py-4 pt-8 sm:px-16">
        <Avatar user={session?.user} />
        <h3 className="text-lg font-medium">Delete Account</h3>
        <p className="text-center text-sm text-neutral-500">
          Warning: This will permanently delete your account and all your QR
          codes.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          toast.promise(deleteAccount(), {
            loading: "Deleting account...",
            success: "Account deleted successfully!",
            error: (err) => err,
          });
        }}
        className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold text-black">
              confirm delete account
            </span>{" "}
            below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern="confirm delete account"
              required
              autoFocus={false}
              autoComplete="off"
              className="border-border-500 focus:border-secondary focus:ring-secondary-100 block w-full rounded-md text-neutral-900 placeholder-neutral-400 focus:outline-none sm:text-sm"
            />
          </div>
        </div>

        <Button
          text="Confirm delete account"
          variant="danger"
          loading={deleting}
        />
      </form>
    </Modal>
  );
}

export function useDeleteAccountModal() {
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const DeleteAccountModalCallback = useCallback(() => {
    return (
      <DeleteAccountModal
        showDeleteAccountModal={showDeleteAccountModal}
        setShowDeleteAccountModal={setShowDeleteAccountModal}
      />
    );
  }, [showDeleteAccountModal, setShowDeleteAccountModal]);

  return useMemo(
    () => ({
      setShowDeleteAccountModal,
      DeleteAccountModal: DeleteAccountModalCallback,
    }),
    [setShowDeleteAccountModal, DeleteAccountModalCallback],
  );
}
