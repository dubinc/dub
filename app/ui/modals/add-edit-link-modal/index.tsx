"use client";

import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  UIEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import BlurImage from "#/ui/blur-image";
import { AlertCircleFill, Lock, Random, X } from "@/components/shared/icons";
import { LoadingCircle } from "#/ui/icons";
import Modal from "#/ui/modal";
import Tooltip, { TooltipContent } from "#/ui/tooltip";
import useProject from "#/lib/hooks/use-project";
import { LinkProps } from "@/lib/types";
import {
  getApexDomain,
  getUrlWithoutUTMParams,
  linkConstructor,
  truncate,
} from "@/lib/utils";
import ExpirationSection from "./expiration-section";
import OGSection from "./og-section";
import PasswordSection from "./password-section";
import UTMSection from "./utm-section";
import IOSSection from "./ios-section";
import Preview from "./preview";
import AndroidSection from "./android-section";
import { DEFAULT_LINK_PROPS, GOOGLE_FAVICON_URL } from "@/lib/constants";
import useDomains from "#/lib/hooks/use-domains";
import { toast } from "sonner";
import va from "@vercel/analytics";
import punycode from "punycode/";
import Button from "#/ui/button";

function AddEditLinkModal({
  showAddEditLinkModal,
  setShowAddEditLinkModal,
  props,
  duplicateProps,
  hideXButton,
  homepageDemo,
}: {
  showAddEditLinkModal: boolean;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  props?: LinkProps;
  duplicateProps?: LinkProps;
  hideXButton?: boolean;
  homepageDemo?: boolean;
}) {
  const { slug } = useParams() as { slug?: string };
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [keyError, setKeyError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [saving, setSaving] = useState(false);

  const { domains, primaryDomain } = useDomains();

  const [data, setData] = useState<LinkProps>(
    props ||
      duplicateProps || {
        ...DEFAULT_LINK_PROPS,
        domain: primaryDomain || "",
        key: "",
        url: "",
      },
  );

  const { domain, key, url, password, proxy } = data;

  const [debouncedKey] = useDebounce(key, 500);
  useEffect(() => {
    /**
     * Only check if key exists if:
     * - modal is open
     * - key is not empty
     * - key is not the same as the original key
     **/
    if (
      showAddEditLinkModal &&
      debouncedKey.length > 0 &&
      debouncedKey !== props?.key
    ) {
      fetch(
        `/api/links/${encodeURIComponent(debouncedKey)}/exists${
          slug ? `?slug=${slug}&domain=${domain}` : ""
        }`,
      ).then(async (res) => {
        if (res.status === 200) {
          const exists = await res.json();
          setKeyError(exists ? "Key already exists" : null);
        }
      });
    }
  }, [debouncedKey, domain]);

  const generateRandomKey = useCallback(async () => {
    setGeneratingKey(true);
    const res = await fetch(
      `/api/links/_random${slug ? `?slug=${slug}&domain=${domain}` : ""}`,
    );
    const key = await res.json();
    setData((prev) => ({ ...prev, key }));
    setGeneratingKey(false);
  }, []);

  const [generatingMetatags, setGeneratingMetatags] = useState(
    props ? true : false,
  );
  const [debouncedUrl] = useDebounce(getUrlWithoutUTMParams(url), 500);
  useEffect(() => {
    // if there's a password, no need to generate metatags
    if (password) {
      setData((prev) => ({
        ...prev,
        title: "Password Required",
        description:
          "This link is password protected. Please enter the password to view it.",
        image: "/_static/password-protected.png",
      }));
      return;
    }
    /**
     * Only generate metatags if:
     * - modal is open
     * - custom OG proxy is not enabled
     **/
    if (showAddEditLinkModal && !proxy) {
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
        fetch(`/api/edge/metatags?url=${debouncedUrl}`).then(async (res) => {
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
      } catch (e) {
        console.log("not a valid url");
      }
    } else {
      setGeneratingMetatags(false);
    }
  }, [debouncedUrl, password, showAddEditLinkModal, proxy]);

  const logo = useMemo(() => {
    // if the link is password protected, or if it's a new link and there's no URL yet,
    // return the default Dub logo
    if (password || (!debouncedUrl && !props)) {
      return "/_static/logo.png";
      // otherwise, get the favicon of the URL
    } else {
      return `${GOOGLE_FAVICON_URL}${getApexDomain(
        debouncedUrl || props?.url || "https://dub.sh",
      )}`;
    }
  }, [password, debouncedUrl, props]);

  const endpoint = useMemo(() => {
    if (props?.key) {
      return {
        method: "PUT",
        url: `/api/links/${encodeURIComponent(props.key)}${
          slug ? `?slug=${slug}&domain=${domain}` : ""
        }`,
      };
    } else {
      return {
        method: "POST",
        url: `/api/links${slug ? `?slug=${slug}&domain=${domain}` : ""}`,
      };
    }
  }, [props]);

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
      - metatags is being generated
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

  const randomIdx = Math.floor(Math.random() * 100);

  const [lockKey, setLockKey] = useState(true);

  return (
    <Modal
      showModal={showAddEditLinkModal}
      setShowModal={setShowAddEditLinkModal}
      closeWithX={homepageDemo ? false : true}
    >
      <div className="relative grid max-h-[80vh] w-full divide-x divide-gray-100 overflow-scroll bg-white shadow-xl transition-all scrollbar-hide md:max-h-[min(906px,_90vh)] md:max-w-screen-lg md:grid-cols-2 md:rounded-2xl md:border md:border-gray-200">
        {!hideXButton && !homepageDemo && (
          <button
            onClick={() => setShowAddEditLinkModal(false)}
            className="group absolute right-0 top-0 z-20 m-3 hidden rounded-full p-2 text-gray-500 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200 md:block"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div
          className="rounded-l-2xl md:max-h-[min(906px,_90vh)] md:overflow-scroll"
          onScroll={handleScroll}
        >
          <div className="z-10 flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 pb-8 pt-8 transition-all md:sticky md:top-0 md:px-16">
            <BlurImage
              src={logo}
              alt="Logo"
              className="h-10 w-10 rounded-full"
              width={20}
              height={20}
            />
            <h3 className="text-lg font-medium">
              {props
                ? `Edit ${linkConstructor({
                    key: props.key,
                    domain: punycode.toUnicode(props.domain || ""),
                    pretty: true,
                  })}`
                : "Create a new link"}
            </h3>
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
                setSaving(false);
                if (res.status === 200) {
                  // track link creation event
                  endpoint.method === "POST" &&
                    va.track("Created Link", {
                      type: slug ? "Custom Domain" : "Default Domain",
                    });
                  mutate(
                    `/api/links${
                      searchParams ? `?${searchParams.toString()}` : ""
                    }`,
                  );
                  mutate(
                    (key) =>
                      typeof key === "string" &&
                      key.startsWith(`/api/links/_count`),
                    undefined,
                    { revalidate: true },
                  );
                  // for welcome page, redirect to links page after adding a link
                  if (pathname === "/welcome") {
                    router.push("/links");
                    setShowAddEditLinkModal(false);
                  } else {
                    // copy shortlink to clipboard when adding a new link
                    if (!props) {
                      navigator.clipboard
                        .writeText(
                          linkConstructor({
                            key: data.key,
                            domain,
                          }),
                        )
                        .then(() => {
                          toast.success("Copied shortlink to clipboard!");
                        });
                    }
                    setShowAddEditLinkModal(false);
                  }
                } else {
                  const error = await res.text();
                  if (error) {
                    toast.error(error);
                    if (error.toLowerCase().includes("key")) {
                      setKeyError(error);
                    } else if (error.toLowerCase().includes("url")) {
                      setUrlError(error);
                    }
                  } else {
                    toast.error(res.statusText);
                  }
                }
              });
            }}
            className="grid gap-6 bg-gray-50 pt-8"
          >
            <div className="grid gap-6 px-4 md:px-16">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`url-${randomIdx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Destination URL
                  </label>
                  {urlError && (
                    <p className="text-sm text-red-600" id="key-error">
                      Invalid url.
                    </p>
                  )}
                </div>
                <div className="relative mt-1 flex rounded-md shadow-sm">
                  <input
                    name="url"
                    id={`url-${randomIdx}`}
                    type="url"
                    required
                    placeholder="https://github.com/steven-tey/dub"
                    value={url}
                    onChange={(e) => {
                      setUrlError(null);
                      setData({ ...data, url: e.target.value });
                    }}
                    className={`${
                      urlError
                        ? "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    } block w-full rounded-md text-sm focus:outline-none`}
                    aria-invalid="true"
                  />
                  {urlError && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <AlertCircleFill
                        className="h-5 w-5 text-red-500"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`key-${randomIdx}`}
                    className="block text-sm font-medium text-gray-700"
                  >
                    Short Link
                  </label>
                  {props && lockKey ? (
                    <button
                      className="flex items-center space-x-2 text-sm text-gray-500 transition-all duration-75 hover:text-black active:scale-95"
                      type="button"
                      onClick={() => {
                        window.confirm(
                          "Editing an existing short link will result in broken links and reset its analytics. Are you sure you want to continue?",
                        ) && setLockKey(false);
                      }}
                    >
                      <Lock className="h-3 w-3" />
                      <p>Unlock</p>
                    </button>
                  ) : (
                    <button
                      className="flex items-center space-x-2 text-sm text-gray-500 transition-all duration-75 hover:text-black active:scale-95"
                      onClick={generateRandomKey}
                      disabled={generatingKey}
                      type="button"
                    >
                      {generatingKey ? (
                        <LoadingCircle />
                      ) : (
                        <Random className="h-3 w-3" />
                      )}
                      <p>{generatingKey ? "Generating" : "Randomize"}</p>
                    </button>
                  )}
                </div>
                <div className="relative mt-1 flex rounded-md shadow-sm">
                  <select
                    disabled={props && lockKey}
                    value={domain}
                    onChange={(e) => {
                      setData({ ...data, domain: e.target.value });
                    }}
                    className={`${
                      props && lockKey ? "cursor-not-allowed" : ""
                    } w-40 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-sm text-gray-500 focus:border-gray-300 focus:outline-none focus:ring-0`}
                  >
                    {domains?.map(({ slug }) => (
                      <option key={slug} value={slug}>
                        {punycode.toUnicode(slug || "")}
                      </option>
                    ))}
                  </select>
                  {props && lockKey ? (
                    <div className="block w-full cursor-not-allowed select-none rounded-r-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500">
                      {props.key}
                    </div>
                  ) : (
                    <input
                      type="text"
                      name="key"
                      id={`key-${randomIdx}`}
                      required
                      pattern="[\p{Letter}\p{Mark}\d-]+" // Unicode regex to match characters from all languages and numbers (and omit all symbols except for dashes)
                      className={`${
                        keyError
                          ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                      } block w-full rounded-r-md pr-10 text-sm focus:outline-none`}
                      placeholder="github"
                      value={key}
                      onChange={(e) => {
                        setKeyError(null);
                        setData({ ...data, key: e.target.value });
                      }}
                      aria-invalid="true"
                      aria-describedby="key-error"
                    />
                  )}
                  {keyError && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <AlertCircleFill
                        className="h-5 w-5 text-red-500"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
                {keyError && (
                  <p className="mt-2 text-sm text-red-600" id="key-error">
                    Short link is already in use.
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-5">
              <div
                className="absolute inset-0 flex items-center px-4 md:px-16"
                aria-hidden="true"
              >
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-gray-50 px-2 text-sm text-gray-500">
                  Optional
                </span>
              </div>
            </div>

            <div className="grid gap-5 px-4 md:px-16">
              <OGSection
                {...{ props, data, setData }}
                generatingMetatags={generatingMetatags}
              />
              <UTMSection {...{ props, data, setData }} />
              <PasswordSection {...{ props, data, setData }} />
              <ExpirationSection {...{ props, data, setData }} />
              <IOSSection {...{ props, data, setData }} />
              <AndroidSection {...{ props, data, setData }} />
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
        <div className="rounded-r-2xl md:max-h-[min(906px,_90vh)] md:overflow-scroll">
          <Preview data={data} generatingMetatags={generatingMetatags} />
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
  const { slug } = useParams() as { slug?: string };

  const { exceededUsage } = useProject();

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const existingModalBackdrop = document.getElementById("modal-backdrop");
    // only open modal with keyboard shortcut if:
    // - c is pressed
    // - user is not pressing cmd/ctrl + c
    // - user is not typing in an input or textarea
    // - there is no existing modal backdrop (i.e. no other modal is open)
    if (
      e.key === "c" &&
      !e.metaKey &&
      !e.ctrlKey &&
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      !existingModalBackdrop
    ) {
      setShowAddEditLinkModal(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return slug && exceededUsage ? ( // only show exceeded usage tooltip if user is on a project page
    <Tooltip
      content={
        <TooltipContent
          title="Your project has exceeded its usage limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
          cta="Upgrade"
          ctaLink={`/${slug}/settings/billing`}
        />
      }
    >
      <div className="flex cursor-not-allowed items-center space-x-3 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-300">
        <p>Create link</p>
        <kbd className="hidden rounded bg-gray-100 px-2 py-0.5 text-xs font-light text-gray-300 md:inline-block">
          C
        </kbd>
      </div>
    </Tooltip>
  ) : (
    <button
      onClick={() => setShowAddEditLinkModal(true)}
      className="group flex items-center space-x-3 rounded-md border border-black bg-black px-3 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
    >
      <p>Create link</p>
      <kbd className="hidden rounded bg-zinc-700 px-2 py-0.5 text-xs font-light text-gray-400 transition-all duration-75 group-hover:bg-gray-100 group-hover:text-gray-500 md:inline-block">
        C
      </kbd>
    </button>
  );
}

export function useAddEditLinkModal({
  props,
  duplicateProps,
  hideXButton,
  homepageDemo,
}: {
  props?: LinkProps;
  duplicateProps?: LinkProps;
  hideXButton?: boolean;
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
        hideXButton={hideXButton}
        homepageDemo={homepageDemo}
      />
    );
  }, [
    showAddEditLinkModal,
    setShowAddEditLinkModal,
    props,
    duplicateProps,
    hideXButton,
    homepageDemo,
  ]);

  const AddEditLinkButtonCallback = useCallback(() => {
    return (
      <AddEditLinkButton setShowAddEditLinkModal={setShowAddEditLinkModal} />
    );
  }, [setShowAddEditLinkModal]);

  return useMemo(
    () => ({
      showAddEditLinkModal,
      setShowAddEditLinkModal,
      AddEditLinkModal: AddEditLinkModalCallback,
      AddEditLinkButton: AddEditLinkButtonCallback,
    }),
    [
      showAddEditLinkModal,
      setShowAddEditLinkModal,
      AddEditLinkModalCallback,
      AddEditLinkButtonCallback,
    ],
  );
}
