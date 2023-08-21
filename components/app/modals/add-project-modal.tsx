import { useRouter } from "next/router";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import { Logo } from "#/ui/icons";
import { AlertCircleFill } from "@/components/shared/icons";
import Modal from "#/ui/modal";
import { generateDomainFromName } from "#/lib/utils";
import slugify from "@sindresorhus/slugify";
import va from "@vercel/analytics";
import Button from "#/ui/button";
import { toast } from "sonner";
import { InfoTooltip } from "#/ui/tooltip";
import { HOME_DOMAIN } from "#/lib/constants";

function AddProjectModalHelper({
  showAddProjectModal,
  setShowAddProjectModal,
}: {
  showAddProjectModal: boolean;
  setShowAddProjectModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();

  const [slugError, setSlugError] = useState<string | null>(null);
  const [domainError, setDomainError] = useState<string | null>(null);
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
      fetch(`/api/domains/${debouncedDomain}/exists`).then(async (res) => {
        if (res.status === 200) {
          const exists = await res.json();
          setDomainError(exists === 1 ? "Domain is already in use." : null);
        }
      });
    }
  }, [debouncedDomain, domainError]);

  useEffect(() => {
    setSlugError(null);
    setDomainError(null);
    setData((prev) => ({
      ...prev,
      slug: slugify(name),
      domain: generateDomainFromName(name),
    }));
  }, [name]);

  const welcomeFlow = useMemo(() => {
    return router.asPath.split("?")[0] === "/welcome";
  }, [router.asPath]);

  return (
    <Modal
      showModal={showAddProjectModal}
      setShowModal={setShowAddProjectModal}
      preventDefaultClose={welcomeFlow}
      {...(welcomeFlow && { onClose: () => router.back() })}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Create a new project</h3>
        <a
          href={`${HOME_DOMAIN}/help/article/what-is-a-project`}
          target="_blank"
          rel="noopener noreferrer"
          className="-translate-y-2 text-center text-xs text-gray-500 underline underline-offset-4 hover:text-gray-800"
        >
          What is a project?
        </a>
      </div>

      <form
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          setSaving(true);
          fetch("/api/projects", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              // track project creation event
              va.track("Created Project");
              mutate("/api/projects");
              if (welcomeFlow) {
                router.push({
                  pathname: "/welcome",
                  query: {
                    type: "upgrade",
                    slug,
                  },
                });
              } else {
                router.push(`/${slug}`);
                toast.success("Successfully created project!");
                setShowAddProjectModal(false);
              }
            } else if (res.status === 422) {
              const {
                slugError: slugErrorResponse,
                domainError: domainErrorResponse,
              } = await res.json();

              if (slugErrorResponse) {
                setSlugError(slugErrorResponse);
                toast.error(slugErrorResponse);
              }
              if (domainErrorResponse) {
                setDomainError(domainErrorResponse);
                toast.error(domainErrorResponse);
              }
            } else {
              toast.error(res.statusText);
            }
            setSaving(false);
          });
        }}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label htmlFor="name" className="flex items-center space-x-2">
            <p className="block text-sm font-medium text-gray-700">
              Project Name
            </p>
            <InfoTooltip content="This is the name of your project on Dub." />
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              name="name"
              id="name"
              type="text"
              required
              autoFocus
              autoComplete="off"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
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
          <label htmlFor="slug" className="flex items-center space-x-2">
            <p className="block text-sm font-medium text-gray-700">
              Project Slug
            </p>
            <InfoTooltip content="This is your project's unique slug on Dub." />
          </label>
          <div className="relative mt-1 flex rounded-md shadow-sm">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-gray-500 sm:text-sm">
              app.dub.co
            </span>
            <input
              name="slug"
              id="slug"
              type="text"
              required
              autoComplete="off"
              pattern="[a-zA-Z0-9\-]+"
              className={`${
                slugError
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
              } block w-full rounded-r-md focus:outline-none sm:text-sm`}
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
          <label htmlFor="domain" className="flex items-center space-x-2">
            <p className="block text-sm font-medium text-gray-700">
              Shortlink Domain
            </p>
            <InfoTooltip content="This is the domain that your short links will be hosted on. E.g. yourbrand.com/link" />
          </label>
          <div className="relative mt-1 flex rounded-md shadow-sm">
            <input
              name="domain"
              id="domain"
              type="text"
              required
              autoComplete="off"
              pattern="[a-zA-Z0-9\-.]+"
              className={`${
                domainError
                  ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
              } block w-full rounded-md focus:outline-none sm:text-sm`}
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
                  href="mailto:support@dub.co?subject=My Domain Is Already In Use"
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

        <Button
          disabled={slugError || domainError ? true : false}
          loading={saving}
          text="Create project"
        />
      </form>
    </Modal>
  );
}

export function useAddProjectModal() {
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);

  const AddProjectModal = useCallback(() => {
    return (
      <AddProjectModalHelper
        showAddProjectModal={showAddProjectModal}
        setShowAddProjectModal={setShowAddProjectModal}
      />
    );
  }, [showAddProjectModal, setShowAddProjectModal]);

  return useMemo(
    () => ({ setShowAddProjectModal, AddProjectModal }),
    [setShowAddProjectModal, AddProjectModal],
  );
}
