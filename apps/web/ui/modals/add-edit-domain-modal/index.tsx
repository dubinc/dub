import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Lock } from "@/ui/shared/icons";
import {
  BlurImage,
  Button,
  ButtonProps,
  InfoTooltip,
  Logo,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { FADE_IN_ANIMATION_SETTINGS, capitalize } from "@dub/utils";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
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
import DomainInput from "./domain-input";

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
  const { id: workspaceId, logo, plan } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const [data, setData] = useState<DomainProps>(
    props || {
      id: "",
      slug: "",
      verified: false,
      primary: false,
      archived: false,
      projectId: workspaceId || "",
    },
  );

  const { slug: domain, placeholder, expiredUrl } = data;

  const [lockDomain, setLockDomain] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - domain is invalid
      - for an existing domain, there's no changes
    */
    if (
      !showAddEditDomainModal ||
      saving ||
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
        method: "PATCH",
        url: `/api/domains/${domain}?workspaceId=${workspaceId}`,
        successMessage: "Successfully updated domain!",
      };
    } else {
      return {
        method: "POST",
        url: `/api/domains?workspaceId=${workspaceId}`,
        successMessage: "Successfully added domain!",
      };
    }
  }, [props]);

  const [expanded, setExpanded] = useState(false);

  return (
    <Modal
      showModal={showAddEditDomainModal}
      setShowModal={setShowAddEditDomainModal}
      className="scrollbar-hide h-fit max-h-[95vh] overflow-auto"
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
            if (res.ok) {
              if (endpoint.method === "POST") {
                await fetch(`/api/links?workspaceId=${workspaceId}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    domain: data.slug,
                    key: "_root",
                    url: "",
                  }),
                });
              }
              await Promise.all([
                mutate(`/api/domains?workspaceId=${workspaceId}`),
                mutate(`/api/links?workspaceId=${workspaceId}`),
              ]);
              setShowAddEditDomainModal(false);
              toast.success(endpoint.successMessage);
              // TODO: Remove after links dashboard is refactored to use new filter UX
              if (!props) {
                router.push(`/${slug}/domains`);
              }
            } else {
              const { error } = await res.json();
              toast.error(error.message);
              if (res.status === 422) {
                setDomainError(error.message);
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
                    "Warning: Changing your workspace's domain will break all existing short links. Are you sure you want to continue?",
                  ) && setLockDomain(false);
                }}
              >
                <Lock className="h-3 w-3" />
                <p>Unlock</p>
              </button>
            )}
          </div>
          {props && lockDomain ? (
            <div className="mt-2 cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm">
              {domain}
            </div>
          ) : (
            <DomainInput
              identifier="slug"
              data={data}
              setData={setData}
              domainError={domainError}
              setDomainError={setDomainError}
            />
          )}
        </div>

        <button
          type="button"
          className="flex items-center"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-5 w-5 text-gray-600 ${
              expanded ? "rotate-90" : ""
            } transition-all`}
          />
          <p className="text-sm text-gray-600">Advanced options</p>
        </button>
        {expanded && (
          <motion.div
            {...FADE_IN_ANIMATION_SETTINGS}
            className="flex flex-col space-y-6"
          >
            <div>
              <label
                htmlFor="expiredUrl"
                className="flex items-center space-x-2"
              >
                <h2 className="text-sm font-medium text-gray-900">
                  Default Expiration URL
                </h2>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="Redirect users to a specific URL when any link under this domain has expired."
                      cta="Learn more."
                      href="https://dub.co/help/article/link-expiration#setting-a-default-expiration-url-for-all-links-under-a-domain"
                    />
                  }
                />
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                {plan === "free" ? (
                  <Tooltip
                    content={
                      <TooltipContent
                        title="You can't configure a custom expired URL on a free plan. Upgrade to a Pro plan to proceed."
                        cta="Upgrade to Pro"
                        onClick={() => {
                          setShowAddEditDomainModal(false);
                          queryParams({
                            set: {
                              upgrade: "pro",
                            },
                          });
                        }}
                      />
                    }
                  >
                    <div className="mt-2 w-full cursor-not-allowed rounded-md border border-gray-300 px-3 py-2 text-left text-sm text-gray-300 sm:max-w-md">
                      https://yourwebsite.com
                    </div>
                  </Tooltip>
                ) : (
                  <div className="relative mt-2 rounded-md shadow-sm">
                    <input
                      type="url"
                      name="expiredUrl"
                      id="expiredUrl"
                      className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                      placeholder="https://yourwebsite.com"
                      value={expiredUrl}
                      onChange={(e) =>
                        setData({ ...data, expiredUrl: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="placeholder"
                className="flex items-center space-x-2"
              >
                <h2 className="text-sm font-medium text-gray-900">
                  Input Placeholder URL
                </h2>
                <InfoTooltip content="Provide context to your teammates in the link creation modal by showing them an example of a link to be shortened." />
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  type="url"
                  name="placeholder"
                  id="placeholder"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="https://dub.co/help/article/what-is-dub"
                  value={placeholder}
                  onChange={(e) =>
                    setData({ ...data, placeholder: e.target.value })
                  }
                />
              </div>
            </div>
          </motion.div>
        )}

        <Button
          text={props ? "Save changes" : "Add domain"}
          disabled={saveDisabled}
          loading={saving}
        />
      </form>
    </Modal>
  );
}

function AddDomainButton({
  setShowAddEditDomainModal,
  buttonProps,
}: {
  setShowAddEditDomainModal: Dispatch<SetStateAction<boolean>>;
  buttonProps?: Partial<ButtonProps>;
}) {
  const { plan, nextPlan, domainsLimit, exceededDomains } = useWorkspace();
  const { queryParams } = useRouterStuff();

  return (
    <div>
      <Button
        text="Add Domain"
        disabledTooltip={
          exceededDomains ? (
            <TooltipContent
              title={`You can only add up to ${domainsLimit} domain${
                domainsLimit === 1 ? "" : "s"
              } on the ${capitalize(plan)} plan. Upgrade to add more domains`}
              cta="Upgrade"
              onClick={() => {
                queryParams({
                  set: {
                    upgrade: nextPlan.name.toLowerCase(),
                  },
                });
              }}
            />
          ) : undefined
        }
        onClick={() => setShowAddEditDomainModal(true)}
        {...buttonProps}
      />
    </div>
  );
}

export function useAddEditDomainModal({
  props,
  buttonProps,
}: { props?: DomainProps; buttonProps?: Partial<ButtonProps> } = {}) {
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

  const AddDomainButtonCallback = useCallback(() => {
    return (
      <AddDomainButton
        setShowAddEditDomainModal={setShowAddEditDomainModal}
        buttonProps={buttonProps}
      />
    );
  }, [setShowAddEditDomainModal, buttonProps]);

  return useMemo(
    () => ({
      setShowAddEditDomainModal,
      AddEditDomainModal: AddEditDomainModalCallback,
      AddDomainButton: AddDomainButtonCallback,
    }),
    [
      setShowAddEditDomainModal,
      AddEditDomainModalCallback,
      AddDomainButtonCallback,
    ],
  );
}
