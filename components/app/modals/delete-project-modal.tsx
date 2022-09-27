import Modal from "@/components/shared/modal";
import {
  useCallback,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { useRouter } from "next/router";
import { mutate } from "swr";
import BlurImage from "@/components/shared/blur-image";
import LoadingDots from "@/components/shared/icons/loading-dots";
import useProject from "@/lib/swr/use-project";
import toast from "react-hot-toast";

function DeleteProjectModal({
  showDeleteProjectModal,
  setShowDeleteProjectModal,
}: {
  showDeleteProjectModal: boolean;
  setShowDeleteProjectModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const { project: { domain } = {} } = useProject();
  const [deleting, setDeleting] = useState(false);

  return (
    <Modal
      showModal={showDeleteProjectModal}
      setShowModal={setShowDeleteProjectModal}
    >
      <div className="inline-block w-full max-w-md overflow-hidden align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 py-4 border-b border-gray-200">
          <BlurImage
            src={`https://logo.clearbit.com/${domain}`}
            alt={domain}
            className="w-10 h-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="font-medium text-lg">Delete Project</h3>
          <p className="text-sm text-gray-500">
            Warning: This will permanently delete your project, custom domain,
            and all associated links + their stats.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setDeleting(true);
            fetch(`/api/projects/${slug}`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(domain),
            }).then(async (res) => {
              setDeleting(false);
              if (res.status === 200) {
                router.push("/");
                mutate("/api/projects");
                setShowDeleteProjectModal(false);
                toast.success("Project deleted successfully.");
              } else {
                const error = await res.json();
                toast.error(JSON.stringify(error));
              }
            });
          }}
          className="flex flex-col space-y-6 text-left bg-gray-50 sm:px-16 px-4 py-8"
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
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
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
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 pr-10 block w-full rounded-md focus:outline-none sm:text-sm"
              />
            </div>
          </div>

          <button
            disabled={deleting}
            className={`${
              deleting
                ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                : "bg-red-600 hover:bg-white hover:text-red-600 border-red-600 text-white"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
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
    [setShowDeleteProjectModal, DeleteProjectModalCallback]
  );
}
