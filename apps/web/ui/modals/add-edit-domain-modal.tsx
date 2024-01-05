import useProject from "@/lib/swr/use-project";
import { DomainProps } from "@/lib/types";
import { ModalContext } from "@/ui/modals/provider";
import { BlurImage } from "@/ui/shared/blur-image";
import { AlertCircleFill, Lock } from "@/ui/shared/icons";
import {
  Button,
  InfoTooltip,
  Logo,
  Modal,
  SimpleTooltipContent,
  Switch,
  Tooltip,
  TooltipContent,
} from "@dub/ui";
import { SHORT_DOMAIN, SWIPE_REVEAL_ANIMATION_SETTINGS } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";

function AddEditDomainModal({
  showAddEditDomainModal,
  setShowAddEditDomainModal,
  props,
}: {
  showAddEditDomainModal: boolean;
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  props?: DomainProps;
}) {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const { logo, plan } = useProject();
  const { setShowUpgradePlanModal } = useContext(ModalContext);

  const [data, setData] = useState<DomainProps>(
    props || {
      slug: "",
      verified: false,
      primary: false,
      target: "",
      type: "redirect",
      clicks: 0,
    },
  );

  const { slug: domain, primary, target, type, placeholder } = data;

  const [debouncedDomain] = useDebounce(domain, 500);
  useEffect(() => {
    if (debouncedDomain.length > 0 && debouncedDomain !== props?.slug) {
      fetch(`/api/domains/${debouncedDomain}/exists`).then(async (res) => {
        if (res.status === 200) {
          const exists = await res.json();
          setDomainError(exists === 1 ? "Domain is already in use." : null);
        }
      });
    }
  }, [debouncedDomain]);

  const [lockDomain, setLockDomain] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - deleting is in progress
      - domain is invalid
      - for an existing domain, there's no changes
    */
    if (
      !showAddEditDomainModal ||
      saving ||
      deleting ||
      domainError ||
      (props &&
        Object.entries(props).every(([key, value]) => data[key] === value))
    ) {
      return true;
    } else {
      return false;
    }
  }, [showAddEditDomainModal, saving, domainError, props, data]);

  const endpoint = useMemo(() => {
    if (props) {
      return {
        method: "PUT",
        url: `/api/projects/${slug}/domains/${domain}`,
        successMessage: "Successfully updated domain!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/projects/${slug}/domains`,
        successMessage: "Successfully added domain!",
      };
    }
  }, [props]);

  async function deleteDomain() {
    setDeleting(true);
    fetch(`/api/projects/${slug}/domains/${domain}`, {
      method: "DELETE",
    }).then(async (res) => {
      if (res.status === 200) {
        await Promise.all([
          mutate(`/api/projects/${slug}/domains`),
          mutate(
            (key) =>
              typeof key === "string" &&
              key.startsWith(`/api/projects/${slug}/links`),
            undefined,
            { revalidate: true },
          ),
        ]);
        setShowAddEditDomainModal(false);
        toast.success("Successfully deleted domain!");
      } else {
        setDomainError("Something went wrong. Please try again.");
      }
      setDeleting(false);
    });
  }

  return (
    <Modal
      showModal={showAddEditDomainModal}
      setShowModal={setShowAddEditDomainModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        {logo ? (
          <BlurImage
            src={logo}
            alt={`Logo for ${slug}`}
            className="h-10 w-10 rounded-full border border-gray-200"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h1 className="text-lg font-medium">{props ? "Edit" : "Add"} Domain</h1>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          fetch(endpoint.url, {
            method: endpoint.method,
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              await mutate(`/api/projects/${slug}/domains`);
              setShowAddEditDomainModal(false);
              toast.success(endpoint.successMessage);
              if (!props) {
                router.push(`/${slug}/domains`);
              }
            } else {
              const errorMessage = await res.text();
              toast.error(errorMessage);
              if (res.status === 422) {
                setDomainError(errorMessage);
              }
            }
            setSaving(false);
          });
        }}
        className="flex flex-col space-y-6 bg-gray-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="domain">
              <h2 className="text-sm font-medium text-gray-700">Domain</h2>
            </label>
            {props && lockDomain && (
              <button
                className="flex items-center space-x-2 text-sm text-gray-500 transition-all duration-75 hover:text-black active:scale-95"
                type="button"
                onClick={() => {
                  window.confirm(
                    "Warning: Changing your project's domain will break all existing short links and reset their analytics. Are you sure you want to continue?",
                  ) && setLockDomain(false);
                }}
              >
                <Lock className="h-3 w-3" />
                <p>Unlock</p>
              </button>
            )}
          </div>
          {props && lockDomain ? (
            <div className="mt-1 cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm">
              {domain}
            </div>
          ) : (
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                name="domain"
                id="domain"
                required
                autoFocus
                autoComplete="off"
                pattern="[[\p{Letter}\p{Mark}\d-.]+"
                className={`${
                  domainError
                    ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                } block w-full rounded-md focus:outline-none sm:text-sm`}
                placeholder={SHORT_DOMAIN}
                value={domain}
                onChange={(e) => {
                  setDomainError(null);
                  setData({ ...data, slug: e.target.value });
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
          )}
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

        <div>
          <label htmlFor="target" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">Landing Page</h2>
            <InfoTooltip content="The page your users will get redirected to when they visit your domain." />
          </label>
          {plan !== "free" ? (
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="url"
                name="target"
                id="target"
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder="https://example.com"
                value={target}
                onChange={(e) => setData({ ...data, target: e.target.value })}
              />
            </div>
          ) : (
            <Tooltip
              content={
                <TooltipContent
                  title="You can't configure a custom landing page on a free plan. Upgrade to a Pro plan to proceed."
                  cta="Upgrade to Pro"
                  onClick={() => {
                    setShowAddEditDomainModal(false);
                    setShowUpgradePlanModal(true);
                  }}
                />
              }
            >
              <div className="mt-1 w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-left text-sm text-gray-300 sm:max-w-md">
                https://yourdomain.com
              </div>
            </Tooltip>
          )}
        </div>

        <AnimatePresence initial={false}>
          {target && (
            <motion.div key="type" {...SWIPE_REVEAL_ANIMATION_SETTINGS}>
              <label
                htmlFor="type"
                className="block text-sm font-medium text-gray-700"
              >
                Behavior
              </label>
              <select
                value={type}
                onChange={(e) =>
                  setData({
                    ...data,
                    type: e.target.value as "redirect" | "rewrite",
                  })
                }
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-500 shadow-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              >
                <option value="redirect">Redirect</option>
                <option value="rewrite">Rewrite (Link Cloaking)</option>
              </select>
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <label htmlFor="placeholder" className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Input Placeholder URL
            </h2>
            <InfoTooltip content="Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened." />
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="url"
              name="placeholder"
              id="placeholder"
              className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
              placeholder="https://dub.co/help/article/what-is-dub"
              value={placeholder}
              onChange={(e) =>
                setData({ ...data, placeholder: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-medium text-gray-900">
              Primary Domain
            </h2>
            <InfoTooltip content="The default domain used in the link creation modal. You can only have one primary domain at a time." />
          </div>
          <Switch
            fn={() => setData((prev) => ({ ...prev, primary: !primary }))}
            checked={primary}
            disabled={props?.primary}
          />
        </div>

        <div className="grid gap-2">
          <Button
            text={props ? "Save changes" : "Add domain"}
            disabled={saveDisabled}
            loading={saving}
          />
          {props &&
            (props.primary ? (
              <Button
                disabledTooltip="You can't delete your primary domain."
                text="Delete domain"
              />
            ) : (
              <Button
                variant="danger"
                text="Delete domain"
                onClick={() => {
                  window.confirm(
                    "Warning: Deleting your project's domain will delete all existing short links using the domain. Are you sure you want to continue?",
                  ) && deleteDomain();
                }}
                loading={deleting}
              />
            ))}
        </div>
      </form>
    </Modal>
  );
}

function AddEditDomainButton({
  setShowAddEditDomainModal,
}: {
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <button
      onClick={() => setShowAddEditDomainModal(true)}
      className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
    >
      Add Domain
    </button>
  );
}

export function useAddEditDomainModal({ props }: { props?: DomainProps } = {}) {
  const [showAddEditDomainModal, setShowAddEditDomainModal] = useState(false);

  const AddEditDomainModalCallback = useCallback(() => {
    return (
      <AddEditDomainModal
        showAddEditDomainModal={showAddEditDomainModal}
        setShowAddEditDomainModal={setShowAddEditDomainModal}
        props={props}
      />
    );
  }, [showAddEditDomainModal, setShowAddEditDomainModal]);

  const AddEditDomainButtonCallback = useCallback(() => {
    return (
      <AddEditDomainButton
        setShowAddEditDomainModal={setShowAddEditDomainModal}
      />
    );
  }, [setShowAddEditDomainModal]);

  return useMemo(
    () => ({
      setShowAddEditDomainModal,
      AddEditDomainModal: AddEditDomainModalCallback,
      AddEditDomainButton: AddEditDomainButtonCallback,
    }),
    [
      setShowAddEditDomainModal,
      AddEditDomainModalCallback,
      AddEditDomainButtonCallback,
    ],
  );
}
