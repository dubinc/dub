import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps } from "@/lib/types";
import { Lock } from "@/ui/shared/icons";
import { ProBadgeTooltip } from "@/ui/shared/pro-badge-tooltip";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  BlurImage,
  Button,
  FileUpload,
  InfoTooltip,
  SimpleTooltipContent,
  Switch,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "framer-motion";
import posthog from "posthog-js";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import DomainInput from "./domain-input";

export function AddEditDomainForm({
  props,
  onSuccess,
  showAdvancedOptions = true,
  className,
}: {
  props?: DomainProps;
  onSuccess?: (data: DomainProps) => void;
  showAdvancedOptions?: boolean;
  className?: string;
}) {
  const { id: workspaceId } = useWorkspace();

  const isDubProvisioned = !!props?.registeredDomain;

  const [data, setData] = useState<DomainProps>(
    props || {
      id: "",
      slug: "",
      verified: false,
      primary: false,
      archived: false,
      projectId: workspaceId || "",
      logo: "",
    },
  );

  const { slug: domain, placeholder, expiredUrl, notFoundUrl, logo } = data;

  const [lockDomain, setLockDomain] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - saving is in progress
      - domain is invalid
      - for an existing domain, there's no changes
    */
    if (
      saving ||
      domainError ||
      (props &&
        Object.entries(props).every(([key, value]) => data[key] === value))
    ) {
      return true;
    } else {
      return false;
    }
  }, [saving, domainError, props, data]);

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
  }, [props, workspaceId]);

  const [showDefaultExpirationUrl, setShowDefaultExpirationUrl] = useState(
    !!data.expiredUrl,
  );
  const [showNotFoundUrl, setShowNotFoundUrl] = useState(!!data.notFoundUrl);

  const [showPlaceholderUrl, setShowPlaceholderUrl] = useState(
    !!data.placeholder,
  );

  return (
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
        })
          .then(async (res) => {
            if (res.ok) {
              await Promise.all([
                mutate(
                  (key) =>
                    typeof key === "string" && key.startsWith("/api/domains"),
                ),
                mutate(
                  (key) =>
                    typeof key === "string" && key.startsWith("/api/links"),
                  undefined,
                  { revalidate: true },
                ),
              ]);
              const data = await res.json();
              posthog.capture(
                props ? "domain_updated" : "domain_created",
                data,
              );
              toast.success(endpoint.successMessage);
              onSuccess?.(data);
            } else {
              setSaving(false);
              const { error } = await res.json();
              if (res.status === 422) {
                setDomainError(error.message);
              }
              if (error.message.includes("Upgrade to Pro")) {
                toast.custom(() => (
                  <UpgradeRequiredToast
                    title="You've discovered a Pro feature!"
                    message={error.message}
                  />
                ));
              } else {
                toast.error(error.message);
              }
            }
          })
          .catch(() => {
            setSaving(false);
            toast.error("Failed to add domain");
          });
      }}
      className={cn("flex flex-col gap-y-6 text-left", className)}
    >
      <div>
        <div className="mb-4 flex items-center justify-center">
          <FileUpload
            accept="images"
            className="h-20 w-20 rounded-full border border-gray-300"
            iconClassName="w-5 h-5"
            variant="plain"
            imageSrc={logo}
            readFile
            onChange={({ src }) => {
              setData((d) => ({ ...d, logo: src }));
            }}
            content={null}
            maxFileSizeMB={2}
            targetResolution={{ width: 240, height: 240 }}
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="domain" className="flex items-center gap-x-2">
            <h2 className="text-sm font-medium text-gray-700">Domain</h2>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Not sure which domain to use?"
                  cta="Check out our guide"
                  href="https://dub.co/help/article/choosing-a-custom-domain"
                />
              }
            />
          </label>
          {props && lockDomain && !isDubProvisioned && (
            <button
              className="flex items-center gap-x-2 text-sm text-gray-500 transition-all duration-75 hover:text-black active:scale-95"
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

      {showAdvancedOptions && (
        <div className="flex flex-col gap-y-6">
          <div>
            <label className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-gray-900">
                  Default Expiration URL
                </h2>
                <ProBadgeTooltip
                  content={
                    <SimpleTooltipContent
                      title="Redirect users to a specific URL when any link under this domain has expired."
                      cta="Learn more."
                      href="https://dub.co/help/article/link-expiration#setting-a-default-expiration-url-for-all-links-under-a-domain"
                    />
                  }
                />
              </div>
              <Switch
                checked={showDefaultExpirationUrl}
                fn={(checked) => {
                  setShowDefaultExpirationUrl(checked);
                  if (!checked) setData((d) => ({ ...d, expiredUrl: "" }));
                }}
              />
            </label>
            <motion.div
              animate={{ height: showDefaultExpirationUrl ? "auto" : 0 }}
              transition={{ duration: 0.1 }}
              initial={false}
              className="-m-1 overflow-hidden p-1"
            >
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  name="expiredUrl"
                  id="expiredUrl"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="https://yourwebsite.com"
                  value={expiredUrl}
                  onChange={(e) =>
                    setData((d) => ({ ...d, expiredUrl: e.target.value }))
                  }
                />
              </div>
            </motion.div>
          </div>

          <div>
            <label className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-gray-900">
                  Not Found URL
                </h2>
                <ProBadgeTooltip content="Redirect users to a specific URL when a link under this domain doesn't exist." />
              </div>
              <Switch
                checked={showNotFoundUrl}
                fn={(checked) => {
                  setShowNotFoundUrl(checked);
                  if (!checked) setData((d) => ({ ...d, notFoundUrl: "" }));
                }}
              />
            </label>
            <motion.div
              animate={{ height: showNotFoundUrl ? "auto" : 0 }}
              transition={{ duration: 0.1 }}
              initial={false}
              className="-m-1 overflow-hidden p-1"
            >
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  name="notFoundUrl"
                  id="notFoundUrl"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="https://yourwebsite.com"
                  value={notFoundUrl}
                  onChange={(e) =>
                    setData((d) => ({ ...d, notFoundUrl: e.target.value }))
                  }
                />
              </div>
            </motion.div>
          </div>

          <div>
            <label className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-medium text-gray-900">
                  Input Placeholder URL
                </h2>
                <InfoTooltip
                  content={
                    <div className="flex max-w-sm flex-col items-center justify-center">
                      <div className="border-b border-gray-200">
                        <BlurImage
                          src="https://assets.dub.co/help/domain-input-placeholder-url.png"
                          alt="Input Placeholder URL"
                          className="aspect-[782/506]"
                          width={782}
                          height={506}
                        />
                      </div>
                      <p className="max-w-xs px-4 py-2 text-center text-sm text-gray-700">
                        Provide context to your teammates in the link creation
                        modal by showing them an example of a link to be
                        shortened.
                      </p>
                    </div>
                  }
                  side="right"
                />
              </div>
              <Switch
                checked={showPlaceholderUrl}
                fn={(checked) => {
                  setShowPlaceholderUrl(checked);
                  if (!checked) setData((d) => ({ ...d, placeholder: "" }));
                }}
              />
            </label>
            <motion.div
              animate={{ height: showPlaceholderUrl ? "auto" : 0 }}
              transition={{ duration: 0.1 }}
              initial={false}
              className="-m-1 overflow-hidden p-1"
            >
              <div className="relative mt-2 rounded-md shadow-sm">
                <input
                  name="placeholder"
                  id="placeholder"
                  className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                  placeholder="https://dub.co/help/article/what-is-dub"
                  value={placeholder}
                  onChange={(e) =>
                    setData((d) => ({ ...d, placeholder: e.target.value }))
                  }
                />
              </div>
            </motion.div>
          </div>
        </div>
      )}
      <Button
        text={props ? "Save changes" : "Add domain"}
        disabled={saveDisabled}
        loading={saving}
      />
    </form>
  );
}
