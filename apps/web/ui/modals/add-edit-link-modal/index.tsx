"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LinkWithTagsProps } from "@/lib/types";
import { DestinationUrlInput } from "@/ui/links/destination-url-input";
import { ShortLinkInput } from "@/ui/links/short-link-input";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import { X } from "@/ui/shared/icons";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  Button,
  LinkLogo,
  Modal,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import {
  DEFAULT_LINK_PROPS,
  deepEqual,
  getApexDomain,
  getUrlWithoutUTMParams,
  isValidUrl,
  linkConstructor,
  truncate,
} from "@dub/utils";
import { useParams, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import {
  Dispatch,
  SetStateAction,
  UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import AndroidSection from "./android-section";
import CloakingSection from "./cloaking-section";
import CommentsSection from "./comments-section";
import ConversionSection from "./conversion-section";
import DoIndexSection from "./doindex-section";
import ExpirationSection from "./expiration-section";
import GeoSection from "./geo-section";
import IOSSection from "./ios-section";
import OGSection from "./og-section";
import PasswordSection from "./password-section";
import Preview from "./preview";
import TagsSection from "./tags-section";
import UTMSection from "./utm-section";

function AddEditLinkModal({
  showAddEditLinkModal,
  setShowAddEditLinkModal,
  props,
  duplicateProps,
  homepageDemo,
}: {
  showAddEditLinkModal: boolean;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  props?: LinkWithTagsProps;
  duplicateProps?: LinkWithTagsProps;
  homepageDemo?: boolean;
}) {
  const params = useParams() as { slug?: string };
  const { slug } = params;
  const { id: workspaceId, nextPlan, conversionEnabled } = useWorkspace();

  const [keyError, setKeyError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<LinkWithTagsProps>(
    props || duplicateProps || DEFAULT_LINK_PROPS,
  );

  const { domain, key, url, password, proxy } = data;

  const [generatingMetatags, setGeneratingMetatags] = useState(
    props ? true : false,
  );
  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);
  useEffect(() => {
    // if there's a password, no need to generate metatags
    if (password) {
      setGeneratingMetatags(false);
      setData((prev) => ({
        ...prev,
        title: "Password Required",
        description:
          "This link is password protected. Please enter the password to view it.",
        image: "https://assets.dub.co/misc/password-protected.png",
      }));
      return;
    }
    /**
     * Only generate metatags if:
     * - modal is open
     * - custom OG proxy is not enabled
     * - url is not empty
     **/
    if (showAddEditLinkModal && !proxy && debouncedUrl.length > 0) {
      setData((prev) => ({
        ...prev,
        title: null,
        description: null,
        image: null,
      }));
      try {
        // if url is valid, continue to generate metatags, else return null
        new URL(debouncedUrl);
        setGeneratingMetatags(true);
        fetch(`/api/metatags?url=${debouncedUrl}`).then(async (res) => {
          if (res.status === 200) {
            const results = await res.json();
            setData((prev) => ({
              ...prev,
              ...{
                title: truncate(results.title, 120),
                description: truncate(results.description, 240),
                image: results.image,
              },
            }));
          }
          // set timeout to prevent flickering
          setTimeout(() => setGeneratingMetatags(false), 200);
        });
      } catch (_) {}
    } else {
      setGeneratingMetatags(false);
    }
  }, [debouncedUrl, password, showAddEditLinkModal]);

  const endpoint = useMemo(() => {
    if (props?.id) {
      return {
        method: "PATCH",
        url: `/api/links/${props.id}?workspaceId=${workspaceId}`,
      };
    } else {
      return {
        method: "POST",
        url: `/api/links?workspaceId=${workspaceId}`,
      };
    }
  }, [props, slug, domain, workspaceId]);

  const [atBottom, setAtBottom] = useState(false);
  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (Math.abs(scrollHeight - scrollTop - clientHeight) < 5) {
      setAtBottom(true);
    } else {
      setAtBottom(false);
    }
  }, []);

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - key is invalid
      - url is invalid
      - for an existing link, there's no changes
    */
    if (
      !showAddEditLinkModal ||
      saving ||
      keyError ||
      urlError ||
      (props &&
        Object.entries(props).every(([key, value]) => {
          // If the key is "title" or "description" and proxy is not enabled, return true (skip the check)
          if (
            (key === "title" || key === "description" || key === "image") &&
            !proxy
          ) {
            return true;
          } else if (key === "geo") {
            const equalGeo = deepEqual(props.geo as object, data.geo as object);
            return equalGeo;
          }
          // Otherwise, check for discrepancy in the current key-value pair
          return data[key] === value;
        }))
    ) {
      return true;
    } else {
      return false;
    }
  }, [showAddEditLinkModal, saving, keyError, urlError, props, data]);

  const keyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (key?.endsWith("-copy")) {
      keyRef.current?.select();
    }
  }, []);

  const { domains, loading, primaryDomain } = useAvailableDomains({
    currentDomain: domain,
  });

  useEffect(() => {
    // for a new link (no props or duplicateProps), set the domain to the primary domain
    if (!loading && primaryDomain && !props && !duplicateProps) {
      setData((prev) => ({
        ...prev,
        domain: primaryDomain,
      }));
    }
  }, [loading, primaryDomain, props, duplicateProps]);

  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();

  const shortLink = useMemo(() => {
    return linkConstructor({
      key: data.key,
      domain: data.domain,
      pretty: true,
    });
  }, [data.key, data.domain]);

  return (
    <Modal
      showModal={showAddEditLinkModal}
      setShowModal={setShowAddEditLinkModal}
      className="max-w-screen-lg"
      preventDefaultClose={homepageDemo ? false : true}
      onClose={() => {
        if (searchParams.has("newLink")) {
          queryParams({
            del: ["newLink", "newLinkDomain"],
          });
        }
      }}
    >
      <div className="scrollbar-hide grid max-h-[95dvh] w-full divide-x divide-gray-100 overflow-auto md:grid-cols-2 md:overflow-hidden">
        {!homepageDemo && (
          <button
            onClick={() => {
              setShowAddEditLinkModal(false);
              if (searchParams.has("newLink")) {
                queryParams({
                  del: ["newLink"],
                });
              }
            }}
            className="group absolute right-0 top-0 z-20 m-3 hidden rounded-full p-2 text-gray-500 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div
          className="scrollbar-hide rounded-l-2xl md:max-h-[95vh] md:overflow-auto"
          onScroll={handleScroll}
        >
          <div className="sticky top-0 z-20 flex h-14 items-center justify-center gap-4 space-y-3 border-b border-gray-200 bg-white px-4 transition-all sm:h-24 md:px-16">
            <LinkLogo apexDomain={getApexDomain(debouncedUrl)} />
            <h3 className="!mt-0 max-w-sm truncate text-lg font-medium">
              {props ? `Edit ${shortLink}` : "Create a new link"}
            </h3>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);

              // @ts-ignore – exclude extra attributes from `data` object before sending to API
              const { user, tags, tagId, ...rest } = data;
              const folderId = searchParams.get("folderId");
              const bodyData = {
                ...rest,
                // Map tags to tagIds
                tagIds: tags.map(({ id }) => id),
                ...(folderId && { folderId }),
              };
              fetch(endpoint.url, {
                method: endpoint.method,
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(bodyData),
              }).then(async (res) => {
                if (res.status === 200) {
                  await mutate(
                    (key) =>
                      typeof key === "string" && key.startsWith("/api/links"),
                    undefined,
                    { revalidate: true },
                  );
                  const data = await res.json();
                  posthog.capture(
                    props ? "link_updated" : "link_created",
                    data,
                  );
                  // copy shortlink to clipboard when adding a new link
                  if (!props) {
                    try {
                      await navigator.clipboard.writeText(data.shortLink);
                      toast.success("Copied shortlink to clipboard!");
                    } catch (e) {
                      console.error(
                        "Failed to automatically copy shortlink to clipboard.",
                        e,
                      );
                      toast.success("Successfully created link!");
                    }
                  } else {
                    toast.success("Successfully updated shortlink!");
                  }
                  setShowAddEditLinkModal(false);
                } else {
                  const { error } = await res.json();
                  if (error) {
                    if (error.message.includes("Upgrade to")) {
                      toast.custom(() => (
                        <UpgradeRequiredToast
                          title={`You've discovered a ${nextPlan.name} feature!`}
                          message={error.message}
                        />
                      ));
                    } else {
                      toast.error(error.message);
                    }
                    const message = error.message.toLowerCase();

                    if (message.includes("key")) {
                      setKeyError(error.message);
                    } else if (message.includes("url")) {
                      setUrlError(error.message);
                    }
                  }
                }
                setSaving(false);
              });
            }}
            className="grid gap-6 bg-gray-50 pt-8"
          >
            <div className="grid gap-6 px-4 md:px-16">
              <DestinationUrlInput
                domain={domain}
                _key={key}
                value={url}
                domains={domains}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setUrlError(null);
                  setData({ ...data, url: e.target.value });
                }}
                required={key !== "_root"}
                error={urlError || undefined}
              />

              {key !== "_root" && (
                <ShortLinkInput
                  ref={keyRef}
                  domain={domain}
                  _key={key}
                  existingLinkProps={props}
                  error={keyError || undefined}
                  onChange={(d) => {
                    setKeyError(null);
                    setData((data) => ({ ...data, ...d }));
                  }}
                  data={data}
                  saving={saving}
                  loading={loading}
                  domains={domains}
                />
              )}
            </div>

            {/* Divider */}
            <div className="relative pb-3 pt-5">
              <div
                className="absolute inset-0 flex items-center px-4 md:px-16"
                aria-hidden="true"
              >
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="-translate-y-1 bg-gray-50 px-2 text-sm text-gray-500">
                  Optional
                </span>
              </div>
            </div>

            <div className="grid gap-5 px-4 md:px-16">
              <TagsSection {...{ props, data, setData }} />
              <CommentsSection {...{ props, data, setData }} />
              {conversionEnabled && (
                <ConversionSection {...{ data, setData }} />
              )}
              <OGSection
                {...{ props, data, setData }}
                generatingMetatags={generatingMetatags}
              />
              <UTMSection {...{ props, data, setData }} />
              <CloakingSection {...{ data, setData }} />
              <PasswordSection {...{ props, data, setData }} />
              <ExpirationSection {...{ props, data, setData }} />
              <IOSSection {...{ props, data, setData }} />
              <AndroidSection {...{ props, data, setData }} />
              <GeoSection {...{ props, data, setData }} />
              <DoIndexSection {...{ data, setData }} />
            </div>

            <div
              className={`${
                atBottom ? "" : "md:shadow-[0_-20px_30px_-10px_rgba(0,0,0,0.1)]"
              } z-10 bg-gray-50 px-4 py-8 transition-all md:sticky md:bottom-0 md:px-16`}
            >
              {homepageDemo ? (
                <Button
                  disabledTooltip="This is a demo link. You can't edit it."
                  text="Save changes"
                />
              ) : (
                <Button
                  disabled={saveDisabled}
                  loading={saving}
                  text={props ? "Save changes" : "Create link"}
                />
              )}
            </div>
          </form>
        </div>
        <div className="scrollbar-hide rounded-r-2xl md:max-h-[95vh] md:overflow-auto">
          <Preview
            data={data}
            setData={setData}
            generatingMetatags={generatingMetatags}
          />
        </div>
      </div>
    </Modal>
  );
}

function AddEditLinkButton({
  setShowAddEditLinkModal,
}: {
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { slug, nextPlan, exceededLinks } = useWorkspace();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const existingModalBackdrop = document.getElementById("modal-backdrop");
    // only open modal with keyboard shortcut if:
    // - c is pressed
    // - user is not pressing cmd/ctrl + c
    // - user is not typing in an input or textarea
    // - there is no existing modal backdrop (i.e. no other modal is open)
    // - workspace has not exceeded links limit
    if (
      e.key.toLowerCase() === "c" &&
      !e.metaKey &&
      !e.ctrlKey &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      !existingModalBackdrop &&
      !exceededLinks
    ) {
      e.preventDefault(); // or else it'll show up in the input field since that's getting auto-selected
      setShowAddEditLinkModal(true);
    }
  }, []);

  // listen to paste event, and if it's a URL, open the modal and input the URL
  const handlePaste = (e: ClipboardEvent) => {
    const pastedContent = e.clipboardData?.getData("text");
    const target = e.target as HTMLElement;
    const existingModalBackdrop = document.getElementById("modal-backdrop");

    // make sure:
    // - pasted content is a valid URL
    // - user is not typing in an input or textarea
    // - there is no existing modal backdrop (i.e. no other modal is open)
    // - workspace has not exceeded links limit
    if (
      pastedContent &&
      isValidUrl(pastedContent) &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      !existingModalBackdrop &&
      !exceededLinks
    ) {
      setShowAddEditLinkModal(true);
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("keydown", onKeyDown),
        document.removeEventListener("paste", handlePaste);
    };
  }, [onKeyDown]);

  return (
    <Button
      text="Create link"
      shortcut="C"
      disabledTooltip={
        exceededLinks ? (
          <TooltipContent
            title="Your workspace has exceeded its monthly links limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
            cta={`Upgrade to ${nextPlan.name}`}
            href={`/${slug}/upgrade`}
          />
        ) : undefined
      }
      onClick={() => setShowAddEditLinkModal(true)}
    />
  );
}

export function useAddEditLinkModal({
  props,
  duplicateProps,
  homepageDemo,
}: {
  props?: LinkWithTagsProps;
  duplicateProps?: LinkWithTagsProps;
  homepageDemo?: boolean;
} = {}) {
  const [showAddEditLinkModal, setShowAddEditLinkModal] = useState(false);

  const AddEditLinkModalCallback = useCallback(() => {
    return (
      <AddEditLinkModal
        showAddEditLinkModal={showAddEditLinkModal}
        setShowAddEditLinkModal={setShowAddEditLinkModal}
        props={props}
        duplicateProps={duplicateProps}
        homepageDemo={homepageDemo}
      />
    );
  }, [showAddEditLinkModal]);

  const AddEditLinkButtonCallback = useCallback(() => {
    return (
      <AddEditLinkButton setShowAddEditLinkModal={setShowAddEditLinkModal} />
    );
  }, []);

  return useMemo(
    () => ({
      showAddEditLinkModal,
      setShowAddEditLinkModal,
      AddEditLinkModal: AddEditLinkModalCallback,
      AddEditLinkButton: AddEditLinkButtonCallback,
    }),
    [showAddEditLinkModal, AddEditLinkModalCallback, AddEditLinkButtonCallback],
  );
}
