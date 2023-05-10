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
import { LoadingDots } from "#/ui/icons";
import Modal from "@/components/shared/modal";
import useProject from "@/lib/swr/use-project";

function DeleteProjectModal({
  showDeleteProjectModal,
  setShowDeleteProjectModal,
}: {
  showDeleteProjectModal: boolean;
  setShowDeleteProjectModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const { logo } = useProject();
  const [deleting, setDeleting] = useState(false);

  async function deleteProject() {
    setDeleting(true);
    await fetch(`/api/projects/${slug}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      setDeleting(false);
      throw new Error(err);
    });
    router.push("/");
    mutate("/api/projects");
    // delay to allow for the route change to complete
    await new Promise((resolve) =>
      setTimeout(() => {
        resolve(null);
      }, 200),
    );
  }

  return (
    <Modal
      showModal={showDeleteProjectModal}
      setShowModal={setShowDeleteProjectModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          <BlurImage
            src={logo || `https://avatar.vercel.sh/${slug}`}
            alt={`Logo for ${slug}`}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Delete Project</h3>
          <p className="text-center text-sm text-gray-500">
            Warning: This will permanently delete your project, custom domain,
            and all associated links and their respective stats.
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
                pattern={slug}
                className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="verification"
              className="block text-sm text-gray-700"
            >
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
                className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              />
            </div>
          </div>

          <button
            disabled={deleting}
            className={`${
              deleting
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600"
            } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
          >
            {deleting ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Confirm delete project</p>
            )}
          </button>
        </form>
      </div>
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
