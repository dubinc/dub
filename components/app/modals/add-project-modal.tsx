import Modal from "@/components/shared/modal";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  Dispatch,
  FormEvent,
  SetStateAction,
} from "react";
import { useRouter } from "next/router";
import BlurImage from "@/components/shared/blur-image";
import { LoadingDots, AlertCircleFill } from "@/components/shared/icons";
import { useDebounce } from "use-debounce";
import { mutate } from "swr";
import { generateSlugFromName } from "@/lib/utils";

function AddProjectModalHelper({
  showAddProjectModal,
  setShowAddProjectModal,
}: {
  showAddProjectModal: boolean;
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();

  const [slugError, setSlugError] = useState(null);
  const [domainError, setDomainError] = useState(null);
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
    if (debouncedSlug.length > 0 && !slugError) {
      fetch(`/api/projects/${slug}/exists`).then(async (res) => {
        if (res.status === 200) {
          const exists = await res.json();
          setSlugError(exists === 1 ? "Slug is already in use." : null);
        }
      });
    }
  }, [debouncedSlug, slugError]);

  const [debouncedDomain] = useDebounce(domain, 500);
  useEffect(() => {
    if (debouncedDomain.length > 0 && !domainError) {
      fetch(`/api/projects/dub.sh/domains/${debouncedDomain}/exists`).then(
        async (res) => {
          if (res.status === 200) {
            const exists = await res.json();
            setDomainError(exists === 1 ? "Domain is already in use." : null);
          }
        }
      );
    }
  }, [debouncedDomain, domainError]);

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      slug: name.toLowerCase().replaceAll(" ", "-"),
      domain: generateSlugFromName(name),
    }));
  }, [name]);

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
            className="w-10 h-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="font-medium text-lg">Add a new project</h3>
        </div>

        <form
          onSubmit={async (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            setSaving(true);
            fetch(`/api/projects`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            }).then(async (res) => {
              setSaving(false);
              if (res.status === 200) {
                mutate(`/api/projects`);
                router.push(`/${slug}`);
              } else if (res.status === 422) {
                const {
                  slugError: slugErrorResponse,
                  domainError: domainErrorResponse,
                } = await res.json();
                if (slugErrorResponse) {
                  setSlugError(slugErrorResponse);
                }
                if (domainErrorResponse) {
                  setDomainError(domainErrorResponse);
                }
              } else {
                setDomainError("Something went wrong.");
              }
            });
          }}
          className="flex flex-col space-y-6 text-left bg-gray-50 sm:px-16 px-4 py-8"
        >
          <div>
            <label
              htmlFor="name"
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
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-gray-500 sm:text-sm">
                app.dub.sh
              </span>
              <input
                name="slug"
                id="slug"
                type="text"
                required
                pattern="[a-zA-Z0-9\-]+"
                className={`${
                  slugError
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                } pr-10 block w-full rounded-r-md focus:outline-none sm:text-sm`}
                placeholder="dub"
                value={slug}
                onChange={(e) => {
                  setSlugError(null);
                  setData({ ...data, slug: e.target.value });
                }}
                aria-invalid="true"
              />
              {slugError && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <AlertCircleFill
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
            {slugError && (
              <p className="mt-2 text-sm text-red-600" id="slug-error">
                {slugError}
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
            <div className="relative flex mt-1 rounded-md shadow-sm">
              <input
                name="domain"
                id="domain"
                type="text"
                required
                pattern="[a-zA-Z0-9\-.]+"
                className={`${
                  domainError
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                } pr-10 block w-full rounded-md focus:outline-none sm:text-sm`}
                placeholder="dub.sh"
                value={domain}
                onChange={(e) => {
                  setDomainError(null);
                  setData({ ...data, domain: e.target.value });
                }}
                aria-invalid="true"
              />
              {domainError && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <AlertCircleFill
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
            {domainError &&
              (domainError === "Domain is already in use." ? (
                <p className="mt-2 text-sm text-red-600" id="domain-error">
                  Domain is already in use.{" "}
                  <a
                    className="underline"
                    href="mailto:steven@dub.sh?subject=My Domain Is Already In Use"
                  >
                    Contact us
                  </a>{" "}
                  if you'd like to use this domain for your project.
                </p>
              ) : (
                <p className="mt-2 text-sm text-red-600" id="domain-error">
                  {domainError}
                </p>
              ))}
          </div>

          <button
            disabled={saving || slugError || domainError}
            className={`${
              saving || slugError || domainError
                ? "cursor-not-allowed bg-gray-100 border-gray-200 text-gray-400"
                : "bg-black hover:bg-white hover:text-black border-black text-white"
            } flex justify-center items-center w-full text-sm h-10 rounded-md border transition-all focus:outline-none`}
          >
            {saving ? <LoadingDots color="#808080" /> : <p>Add project</p>}
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
