import useWorkspace from "@/lib/swr/use-workspace";
import { BlurImage, Button, Logo, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function DeleteWorkspaceModal({
  showDeleteWorkspaceModal,
  setShowDeleteWorkspaceModal,
}: {
  showDeleteWorkspaceModal: boolean;
  setShowDeleteWorkspaceModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { update } = useSession();
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const { id, isOwner, name, logo } = useWorkspace();

  const [deleting, setDeleting] = useState(false);
  const [workspaceSlugVerification, setWorkspaceSlugVerification] =
    useState("");
  const [verification, setVerification] = useState("");

  const confirmationText = "confirm delete workspace";
  const isVerified = verification === confirmationText;
  const isSlugVerified = workspaceSlugVerification === slug;

  async function deleteWorkspace() {
    return new Promise((resolve, reject) => {
      setDeleting(true);
      fetch(`/api/workspaces/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }).then(async (res) => {
        if (res.ok) {
          await Promise.all([mutate("/api/workspaces"), update()]);
          router.push("/");
          resolve(null);
        } else {
          setDeleting(false);
          const { error } = await res.json();
          reject(error.message);
        }
      });
    });
  }

  const { isMobile } = useMediaQuery();

  return (
    <Modal
      showModal={showDeleteWorkspaceModal}
      setShowModal={setShowDeleteWorkspaceModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Delete Workspace</h3>
        <p className="text-sm text-neutral-500">
          Warning: This will permanently delete your workspace, custom domains,
          and all associated links and their respective analytics.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          toast.promise(deleteWorkspace(), {
            loading: "Deleting workspace...",
            success: "Workspace deleted successfully!",
            error: (err) => err,
          });
        }}
        className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6"
      >
        <div className="relative flex items-center gap-3 rounded-md border border-neutral-300 bg-white px-4 py-2">
          {logo ? (
            <BlurImage
              src={logo}
              alt="Workspace logo"
              className="size-7 rounded-full"
              width={20}
              height={20}
            />
          ) : (
            <Logo className="size-7 text-neutral-500" />
          )}

          <div className="flex flex-1 flex-col gap-0.5">
            <h3 className="line-clamp-1 text-sm font-medium text-neutral-600">
              {name || slug}
            </h3>
            <p className="text-xs font-medium text-neutral-500">
              app.dub.co/{slug}
            </p>
          </div>
        </div>

        <div>
          <label
            htmlFor="workspace-slug"
            className="block text-sm text-neutral-700"
          >
            Enter the workspace slug{" "}
            <span className="font-semibold">{slug}</span> to continue:
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="workspace-slug"
              id="workspace-slug"
              autoFocus={!isMobile}
              autoComplete="off"
              pattern={slug}
              required
              disabled={!isOwner}
              value={workspaceSlugVerification}
              onChange={(e) => setWorkspaceSlugVerification(e.target.value)}
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-100": !isOwner,
                },
              )}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold">{confirmationText}</span> below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={confirmationText}
              required
              autoComplete="off"
              disabled={!isOwner}
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              className={cn(
                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-neutral-100": !isOwner,
                },
              )}
            />
          </div>
        </div>

        <Button
          text="Delete"
          variant="danger"
          loading={deleting}
          disabled={!isVerified || !isSlugVerified || !isOwner}
          {...(!isOwner && {
            disabledTooltip: "Only workspace owners can delete a workspace.",
          })}
        />
      </form>
    </Modal>
  );
}

export function useDeleteWorkspaceModal() {
  const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] =
    useState(false);

  const DeleteWorkspaceModalCallback = useCallback(() => {
    return (
      <DeleteWorkspaceModal
        showDeleteWorkspaceModal={showDeleteWorkspaceModal}
        setShowDeleteWorkspaceModal={setShowDeleteWorkspaceModal}
      />
    );
  }, [showDeleteWorkspaceModal]);

  return useMemo(
    () => ({
      setShowDeleteWorkspaceModal,
      DeleteWorkspaceModal: DeleteWorkspaceModalCallback,
    }),
    [DeleteWorkspaceModalCallback],
  );
}
