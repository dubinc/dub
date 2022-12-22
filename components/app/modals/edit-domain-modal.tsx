import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import BlurImage from "@/components/shared/blur-image";
import { AlertCircleFill } from "@/components/shared/icons";
import LoadingDots from "@/components/shared/icons/loading-dots";
import Modal from "@/components/shared/modal";
import useProject from "@/lib/swr/use-project";

function EditDomainModal({
  showEditDomainModal,
  setShowEditDomainModal,
}: {
  showEditDomainModal: boolean;
  setShowEditDomainModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug } = router.query;
  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState(null);
  const { project: { domain } = {} } = useProject();

  const [newDomain, setNewDomain] = useState("");

  const [debouncedDomain] = useDebounce(newDomain, 500);
  useEffect(() => {
    if (debouncedDomain.length > 0 && debouncedDomain !== domain) {
      fetch(`/api/projects/${slug}/domains/${debouncedDomain}/exists`).then(
        async (res) => {
          if (res.status === 200) {
            const exists = await res.json();
            setDomainError(exists === 1 ? "Domain is already in use." : null);
          }
        },
      );
    }
  }, [debouncedDomain]);

  return (
    <Modal
      showModal={showEditDomainModal}
      setShowModal={setShowEditDomainModal}
    >
      <div className="inline-block w-full transform overflow-hidden bg-white align-middle shadow-xl transition-all sm:max-w-md sm:rounded-2xl sm:border sm:border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
          <BlurImage
            src={`https://www.google.com/s2/favicons?sz=64&domain_url=${domain}`}
            alt={domain}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
          <h3 className="text-lg font-medium">Change Domain</h3>
          <p className="text-center text-sm text-gray-500">
            Warning: Changing your project's domain will break all existing
            short links and reset their analytics.
          </p>
        </div>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            fetch(`/api/projects/${slug}/domains/${domain}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newDomain),
            }).then(async (res) => {
              setSaving(false);
              if (res.status === 200) {
                mutate(`/api/projects/${slug}`);
                setShowEditDomainModal(false);
              } else if (res.status === 422) {
                const { domainError: domainErrorResponse } = await res.json();
                if (domainErrorResponse) {
                  setDomainError(domainErrorResponse);
                }
              } else if (res.status === 400) {
                setDomainError("Domain is already in use.");
              }
            });
          }}
          className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
        >
          <div>
            <label
              htmlFor="old-domain"
              className="block text-sm font-medium text-gray-700"
            >
              Old Domain
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="old-domain"
                id="old-domain"
                autoFocus={false}
                readOnly
                className="text-gray-90 pointer-events-none block w-full rounded-md border-gray-300 pr-10 focus:outline-none focus:ring-0 sm:text-sm"
                value={domain}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="new-domain"
              className="block text-sm font-medium text-gray-700"
            >
              New Domain
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="new-domain"
                id="new-domain"
                required
                pattern="[a-zA-Z0-9\-.]+"
                autoFocus={false}
                className={`${
                  domainError
                    ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                } block w-full rounded-md pr-10 focus:outline-none sm:text-sm`}
                placeholder="newdomain.com"
                value={newDomain}
                onChange={(e) => {
                  setDomainError(null);
                  setNewDomain(e.target.value);
                }}
                aria-invalid="true"
                aria-describedby="domain-error"
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

          <div>
            <label
              htmlFor="verification"
              className="block text-sm text-gray-700"
            >
              To verify, type{" "}
              <span className="font-semibold text-red-600">
                yes, change my domain
              </span>{" "}
              below
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="verification"
                id="verification"
                pattern="yes, change my domain"
                placeholder="yes, change my domain"
                required
                autoFocus={false}
                className="block w-full rounded-md border-gray-300 pr-10 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              />
            </div>
          </div>

          <button
            disabled={saving || domainError}
            className={`${
              saving || domainError
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600"
            } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
          >
            {saving ? (
              <LoadingDots color="#808080" />
            ) : (
              <p>Confirm domain change</p>
            )}
          </button>
        </form>
      </div>
    </Modal>
  );
}

export function useEditDomainModal() {
  const [showEditDomainModal, setShowEditDomainModal] = useState(false);

  const EditDomainModalCallback = useCallback(() => {
    return (
      <EditDomainModal
        showEditDomainModal={showEditDomainModal}
        setShowEditDomainModal={setShowEditDomainModal}
      />
    );
  }, [showEditDomainModal, setShowEditDomainModal]);

  return useMemo(
    () => ({
      setShowEditDomainModal,
      EditDomainModal: EditDomainModalCallback,
    }),
    [setShowEditDomainModal, EditDomainModalCallback],
  );
}
