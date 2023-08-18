import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import BlurImage from "#/ui/blur-image";
import Modal from "#/ui/modal";
import useProject from "#/lib/swr/use-project";
import Button from "#/ui/button";
import { cn } from "#/lib/utils";

function DeleteProjectModal({
  showDeleteProjectModal,
  setShowDeleteProjectModal,
}: {
  showDeleteProjectModal: boolean;
  setShowDeleteProjectModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const { id, logo, plan, isOwner } = useProject();

  const [deleting, setDeleting] = useState(false);

  async function deleteProject() {
    return new Promise((resolve, reject) => {
      setDeleting(true);
      fetch(`/api/projects/${slug}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }).then(async (res) => {
        setDeleting(false);
        if (res.ok) {
          router.push("/");
          mutate("/api/projects");
          // delay to allow for the route change to complete
          await new Promise(() =>
            setTimeout(() => {
              resolve(null);
            }, 200),
          );
        } else {
          const error = await res.text();
          reject(error);
        }
      });
    });
  }

  return (
    <Modal
      showModal={showDeleteProjectModal}
      setShowModal={setShowDeleteProjectModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <BlurImage
          src={logo || `https://avatar.vercel.sh/${id}`}
          alt={id || "Delete Project"}
          className="h-10 w-10 rounded-full border border-gray-200"
          width={20}
          height={20}
        />
        <h3 className="text-lg font-medium">Delete Project</h3>
        <p className="text-center text-sm text-gray-500">
          Warning: This will permanently delete your project, custom domain, and
          all associated links and their respective stats.
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          toast.promise(deleteProject(), {
            loading: "Deleting project...",
            success: "Project deleted successfully!",
            error: (err) => err,
          });
        }}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label
            htmlFor="project-slug"
            className="block text-sm font-medium text-gray-700"
          >
            Enter the project slug{" "}
            <span className="font-semibold text-black">{slug}</span> to
            continue:
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="project-slug"
              id="project-slug"
              autoFocus={false}
              autoComplete="off"
              pattern={slug}
              disabled={plan === "enterprise" && !isOwner}
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-100":
                    plan === "enterprise" && !isOwner,
                },
              )}
            />
          </div>
        </div>

        <div>
          <label htmlFor="verification" className="block text-sm text-gray-700">
            To verify, type{" "}
            <span className="font-semibold text-black">
              confirm delete project
            </span>{" "}
            below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern="confirm delete project"
              required
              autoFocus={false}
              autoComplete="off"
              disabled={plan === "enterprise" && !isOwner}
              className={cn(
                "block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
                {
                  "cursor-not-allowed bg-gray-100":
                    plan === "enterprise" && !isOwner,
                },
              )}
            />
          </div>
        </div>

        <Button
          text="Confirm delete project"
          variant="danger"
          loading={deleting}
          {...(plan === "enterprise" &&
            !isOwner && {
              disabledTooltip: "Only project owners can delete a project.",
            })}
        />
      </form>
    </Modal>
  );
}

export function useDeleteProjectModal() {
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);

  const DeleteProjectModalCallback = useCallback(() => {
    return (
      <DeleteProjectModal
        showDeleteProjectModal={showDeleteProjectModal}
        setShowDeleteProjectModal={setShowDeleteProjectModal}
      />
    );
  }, [showDeleteProjectModal, setShowDeleteProjectModal]);

  return useMemo(
    () => ({
      setShowDeleteProjectModal,
      DeleteProjectModal: DeleteProjectModalCallback,
    }),
    [setShowDeleteProjectModal, DeleteProjectModalCallback],
  );
}
