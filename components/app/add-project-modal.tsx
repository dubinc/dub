import Modal from "@/components/shared/modal";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { useRouter } from "next/router";
import BlurImage from "@/components/shared/blur-image";
import {
  LoadingDots,
  LoadingCircle,
  AlertCircleFill,
} from "@/components/shared/icons";
import { useDebounce } from "use-debounce";
import { mutate } from "swr";

function AddProjectModalHelper({
  showAddProjectModal,
  setShowAddProjectModal,
}: {
  showAddProjectModal: boolean;
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();

  const [slugExistsError, setSlugExistsError] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [buttonText, setButtonText] = useState("Add project");
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<{
    name: string;
    slug: string;
    domain: string;
  }>({
    name: "",
    slug: "",
    domain: "",
  });
  const { name, slug, domain } = data;

  const [debouncedSlug] = useDebounce(slug, 500);
  useEffect(() => {
    if (debouncedSlug.length > 0) {
      fetch(`/api/projects/${slug}/exists`).then(async (res) => {
        if (res.status === 200) {
          const exists = await res.json();
          setSlugExistsError(exists === 1);
        }
      });
    }
  }, [debouncedSlug]);

  const generateRandomSlug = useCallback(async () => {
    setGeneratingSlug(true);
    const res = await fetch(
      domain
        ? `/api/projects/${slug}/domains/${domain}/links/random`
        : `/api/edge/links/random`
    );
    const key = await res.json();
    setData((prev) => ({ ...prev, key }));
    setGeneratingSlug(false);
  }, []);

  return (
    <Modal
      showModal={showAddProjectModal}
      setShowModal={setShowAddProjectModal}
    >
      <div className="inline-block w-full max-w-md overflow-hidden align-middle transition-all transform bg-white shadow-xl rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 py-4 border-b border-gray-200">
          <BlurImage
            src={`/static/logo.png`}
            alt={"dub.sh"}
            className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600"
            width={20}
            height={20}
          />
          <h3 className="font-medium text-lg">Add a new project</h3>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            fetch(`/api/projects`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            })
              .then((res) => {
                setSaving(false);
                if (res.status === 200) {
                  setButtonText("Saved!");
                  mutate(`/api/projects`);
                  setShowAddProjectModal(false);
                  router.push(`/${slug}`);
                }
              })
              .catch(() => {
                setSaving(false);
                setButtonText("Add project");
                setSlugExistsError(true);
              });
          }}
          className="flex flex-col space-y-6 text-left bg-gray-50 sm:px-16 px-4 py-8"
        >
          <div>
            <label
              htmlFor="key"
              className="block text-sm font-medium text-gray-700"
            >
              Project Name
            </label>
            <div className="flex mt-1 rounded-md shadow-sm">
              <input
                name="name"
                id="name"
                type="text"
                required
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 block w-full rounded-md focus:outline-none sm:text-sm"
                placeholder="Dub"
                value={name}
                onChange={(e) => {
                  setData({ ...data, name: e.target.value });
                }}
                aria-invalid="true"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700"
            >
              Project Slug
            </label>
            <div className="relative flex mt-1 rounded-md shadow-sm">
              <input
                name="slug"
                id="slug"
                type="text"
                required
                className={`${
                  slugExistsError
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                } pr-10 block w-full rounded-md focus:outline-none sm:text-sm`}
                placeholder="dub"
                value={slug}
                onChange={(e) => {
                  setSlugExistsError(false);
                  setData({ ...data, slug: e.target.value });
                }}
                aria-invalid="true"
              />
              {slugExistsError && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <AlertCircleFill
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
            {slugExistsError && (
              <p className="mt-2 text-sm text-red-600" id="slug-error">
                Slug is already in use.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="domain"
              className="block text-sm font-medium text-gray-700"
            >
              Domain
            </label>
            <div className="flex mt-1 rounded-md shadow-sm">
              <input
                name="domain"
                id="domain"
                type="url"
                required
                className="border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500 block w-full rounded-md focus:outline-none sm:text-sm"
                placeholder="dub.sh"
                pattern="(https?://)?.+"
                value={domain}
                onChange={(e) => {
                  setData({ ...data, domain: e.target.value });
                }}
                aria-invalid="true"
              />
            </div>
          </div>

          <button
            disabled={saving || slugExistsError}
            className={`${
              saving || slugExistsError
                ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                : "bg-black hover:bg-white hover:text-black border-black text-white"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
          >
            {saving ? <LoadingDots color="#808080" /> : <p>{buttonText}</p>}
          </button>
        </form>
      </div>
    </Modal>
  );
}

export function useAddProjectModal({ domain }: { domain?: string }) {
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  const AddProjectModal = useCallback(() => {
    return (
      <AddProjectModalHelper
        showAddProjectModal={showAddProjectModal}
        setShowAddProjectModal={setShowAddProjectModal}
      />
    );
  }, [showAddProjectModal, setShowAddProjectModal, domain]);

  return useMemo(
    () => ({ setShowAddProjectModal, AddProjectModal }),
    [setShowAddProjectModal, AddProjectModal]
  );
}
