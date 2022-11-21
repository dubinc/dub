import { useRouter } from "next/router";
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
import { mutate } from "swr";
import { useDebounce } from "use-debounce";
import BlurImage from "@/components/shared/blur-image";
import {
  AlertCircleFill,
  LoadingCircle,
  LoadingDots,
  Random,
  X,
} from "@/components/shared/icons";
import Modal from "@/components/shared/modal";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import { LinkProps } from "@/lib/types";
import {
  getApexDomain,
  getQueryString,
  getUrlWithoutUTMParams,
  linkConstructor,
} from "@/lib/utils";
import ExpirationSection from "./expiration-section";
import OGSection from "./og-section";
import PasswordSection from "./password-section";
import UTMSection from "./utm-section";
import Preview from "./preview";

function AddEditLinkModal({
  showAddEditLinkModal,
  setShowAddEditLinkModal,
  props,
  hideXButton,
}: {
  showAddEditLinkModal: boolean;
  setShowAddEditLinkModal: Dispatch<SetStateAction<boolean>>;
  props?: LinkProps;
  hideXButton?: boolean;
}) {
  const router = useRouter();
  const { slug } = router.query as { slug: string };
  const { project: { domain } = {} } = useProject();

  const [keyExistsError, setKeyExistsError] = useState(false);
  const [urlError, setUrlError] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<LinkProps>(
    props || {
      domain: domain || "",
      key: "",
      url: "",
      archived: false,
      expiresAt: null,
      password: null,

      title: null,
      description: null,
      image: null,

      clicks: 0,
      userId: "",
      createdAt: new Date(),

      customOg: false,
    },
  );
  const { key, url, password, customOg } = data;

  const [debouncedKey] = useDebounce(key, 500);
  useEffect(() => {
    if (debouncedKey.length > 0 && debouncedKey !== props?.key) {
      fetch(
        domain
          ? `/api/projects/${slug}/domains/${domain}/links/${debouncedKey}/exists`
          : `/api/links/${debouncedKey}/exists`,
      ).then(async (res) => {
        if (res.status === 200) {
          const exists = await res.json();
          setKeyExistsError(exists);
        }
      });
    }
  }, [debouncedKey]);

  const generateRandomSlug = useCallback(async () => {
    setGeneratingSlug(true);
    const res = await fetch(
      domain
        ? `/api/projects/${slug}/domains/${domain}/links/random`
        : `/api/links/random`,
    );
    const key = await res.json();
    setData((prev) => ({ ...prev, key }));
    setGeneratingSlug(false);
  }, []);

  // const onPaste = useCallback(
  //   (e: React.ClipboardEvent<HTMLInputElement>) => {
  //     if (props) return;
  //     const url = e.clipboardData.getData("text");
  //     setShowAddEditLinkModal(true);
  //     try {
  //       new URL(url);
  //       console.log(url);
  //       setData((prev) => ({ ...prev, url }));
  //     } catch (e) {
  //       console.log("not a valid url");
  //     }
  //   },
  //   [props, showAddEditLinkModal, setData],
  // );

  // useEffect(() => {
  //   window.addEventListener("paste", onPaste as any);
  //   return () => window.removeEventListener("paste", onPaste as any);
  // }, [onPaste]);

  const [generatingMetatags, setGeneratingMetatags] = useState(false);
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
     * - custom OG is not enabled or the url has changed
     **/
    if (
      showAddEditLinkModal &&
      (!customOg || debouncedUrl !== getUrlWithoutUTMParams(props?.url))
    ) {
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
          setGeneratingMetatags(false);
          if (res.status === 200) {
            const results = await res.json();
            setData((prev) => ({ ...prev, ...results }));
          }
        });
      } catch (e) {
        console.log("not a valid url");
      }
    } else {
      setGeneratingMetatags(false);
    }
  }, [debouncedUrl, password, showAddEditLinkModal, customOg]);

  const logo = useMemo(() => {
    if (password || (!debouncedUrl && !props)) {
      return "/_static/logo.png";
    } else {
      return `https://www.google.com/s2/favicons?sz=64&domain_url=${getApexDomain(
        debouncedUrl || props.url,
      )}`;
    }
  }, [password, debouncedUrl, props]);

  const endpoint = useMemo(() => {
    if (props?.key) {
      return {
        method: "PUT",
        url: domain
          ? `/api/projects/${slug}/domains/${domain}/links/${props.key}`
          : `/api/links/${props.key}`,
      };
    } else {
      return {
        method: "POST",
        url: domain
          ? `/api/projects/${slug}/domains/${domain}/links`
          : `/api/links`,
      };
    }
  }, [props]);

  const [scrolled, setScrolled] = useState(false);
  const handleScroll = (event: UIEvent<HTMLElement>) => {
    if (event.currentTarget.scrollTop > 144) {
      setScrolled(true);
    } else {
      setScrolled(false);
    }
  };

  const saveDisabled = useMemo(() => {
    /* 
      Disable save if:
      - modal is not open
      - saving is in progress
      - key is invalid
      - url is invalid
      - for an existing link, there's no changes
    */
    if (!showAddEditLinkModal) {
      return true;
    } else if (
      saving ||
      keyExistsError ||
      urlError ||
      (props &&
        Object.entries(props).every(([key, value]) => data[key] === value))
    ) {
      return true;
    } else {
      return false;
    }
  }, [saving, keyExistsError, urlError, props, data, showAddEditLinkModal]);

  return (
    <Modal
      showModal={showAddEditLinkModal}
      setShowModal={setShowAddEditLinkModal}
      closeWithX={true}
    >
      <div className="grid max-h-[80vh] w-full divide-x divide-gray-100 overflow-scroll bg-white shadow-xl transition-all scrollbar-hide sm:max-w-screen-lg sm:grid-cols-2 sm:rounded-2xl sm:border sm:border-gray-200">
        {!hideXButton && (
          <button
            onClick={() => setShowAddEditLinkModal(false)}
            className="group absolute top-0 right-0 m-3 hidden rounded-full p-2 text-gray-500 transition-all duration-75 hover:bg-gray-100 focus:outline-none active:bg-gray-200 sm:block"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <div
          className="max-h-[80vh] overflow-scroll rounded-l-2xl"
          onScroll={handleScroll}
        >
          <div
            className={`${
              scrolled ? "py-5" : "pt-10 pb-8"
            } sticky top-0 z-10 flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 transition-all sm:px-16`}
          >
            <BlurImage
              src={logo}
              alt="Logo"
              className="h-10 w-10 rounded-full"
              width={20}
              height={20}
            />
            {!scrolled && (
              <h3 className="text-lg font-medium">
                {props
                  ? `Edit ${linkConstructor({
                      key: props.key,
                      domain,
                      pretty: true,
                    })}`
                  : "Add a new link"}
              </h3>
            )}
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
              }).then((res) => {
                setSaving(false);
                if (res.status === 200) {
                  mutate(
                    domain
                      ? `/api/projects/${slug}/domains/${domain}/links${getQueryString(
                          router,
                        )}`
                      : `/api/links${getQueryString(router)}`,
                  );
                  if (router.asPath === "/welcome") {
                    router.push("/links").then(() => {
                      setShowAddEditLinkModal(false);
                    });
                  } else {
                    setShowAddEditLinkModal(false);
                  }
                } else if (res.status === 403) {
                  setKeyExistsError(true);
                } else if (res.status === 400) {
                  setUrlError(true);
                } else {
                  alert("Something went wrong");
                }
              });
            }}
            className="grid gap-6 bg-gray-50 pt-8"
          >
            <div className="grid gap-6 px-4 sm:px-16">
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="key"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Short Link
                  </label>
                  <button
                    className="flex items-center space-x-2 text-sm text-gray-500 transition-all duration-75 hover:text-black active:scale-95"
                    onClick={generateRandomSlug}
                    disabled={generatingSlug}
                    type="button"
                  >
                    {generatingSlug ? (
                      <LoadingCircle />
                    ) : (
                      <Random className="h-3 w-3" />
                    )}
                    <p>{generatingSlug ? "Generating" : "Randomize"}</p>
                  </button>
                </div>
                <div className="relative mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center whitespace-nowrap rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-5 text-sm text-gray-500">
                    {domain || "dub.sh"}
                  </span>
                  <input
                    type="text"
                    name="key"
                    id="key"
                    required
                    autoFocus={false}
                    pattern="[\p{Letter}\p{Mark}\d-]+" // Unicode regex to match characters from all languages and numbers (and omit all symbols except for dashes)
                    className={`${
                      keyExistsError
                        ? "border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:ring-gray-500"
                    } block w-full rounded-r-md pr-10 text-sm focus:outline-none`}
                    placeholder="github"
                    value={key}
                    onChange={(e) => {
                      setKeyExistsError(false);
                      setData({ ...data, key: e.target.value });
                    }}
                    aria-invalid="true"
                    aria-describedby="key-error"
                  />
                  {keyExistsError && (
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <AlertCircleFill
                        className="h-5 w-5 text-red-500"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </div>
                {keyExistsError && (
                  <p className="mt-2 text-sm text-red-600" id="key-error">
                    Short link is already in use.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-gray-700"
                >
                  Destination URL
                </label>
                <div className="relative mt-1 flex rounded-md shadow-sm">
                  <input
                    name="url"
                    id="url"
                    type="url"
                    required
                    placeholder="https://github.com/steven-tey/dub"
                    value={url}
                    onChange={(e) => {
                      setUrlError(false);
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
                {urlError && (
                  <p className="mt-2 text-sm text-red-600" id="key-error">
                    Invalid url.
                  </p>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative py-5">
              <div
                className="absolute inset-0 flex items-center px-4 sm:px-16"
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

            <div className="grid gap-5 px-4 sm:px-16">
              <OGSection
                {...{ props, data, setData }}
                generatingMetatags={generatingMetatags}
              />
              <UTMSection {...{ props, data, setData }} />
              <PasswordSection {...{ props, data, setData }} />
              <ExpirationSection {...{ props, data, setData }} />
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-4 py-8 sm:px-16">
              <button
                disabled={saveDisabled}
                className={`${
                  saveDisabled
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : "border-black bg-black text-white hover:bg-white hover:text-black"
                } flex h-10 w-full items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
              >
                {saving ? (
                  <LoadingDots color="#808080" />
                ) : (
                  <p className="text-sm">
                    {props ? "Save changes" : "Add link"}
                  </p>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="max-h-[80vh] overflow-scroll rounded-r-2xl">
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
  const router = useRouter();
  const { slug } = router.query as { slug?: string };

  const { isOwner } = useProject();
  const { exceededUsage } = useUsage();

  return slug && exceededUsage ? ( // only show exceeded usage tooltip if user is on a project page
    <Tooltip
      content={
        <TooltipContent
          title={
            isOwner
              ? "You have exceeded your usage limit. We're still collecting data on your existing links, but you need to upgrade to add more links."
              : "The owner of this project has exceeded their usage limit. We're still collecting data on all existing links, but they need to upgrade their plan to add more links."
          }
          cta={isOwner && "Upgrade"}
          ctaLink={isOwner && "/settings"}
        />
      }
    >
      <div className="cursor-not-allowed rounded-md border border-gray-200 px-5 py-2 text-sm font-medium text-gray-300 transition-all duration-75">
        Add
      </div>
    </Tooltip>
  ) : (
    <button
      onClick={() => setShowAddEditLinkModal(true)}
      className="rounded-md border border-black bg-black px-5 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black active:scale-95"
    >
      Add
    </button>
  );
}

export function useAddEditLinkModal({
  props,
  hideXButton,
}: {
  props?: LinkProps;
  hideXButton?: boolean;
}) {
  const [showAddEditLinkModal, setShowAddEditLinkModal] = useState(false);

  const AddEditLinkModalCallback = useCallback(() => {
    return (
      <AddEditLinkModal
        showAddEditLinkModal={showAddEditLinkModal}
        setShowAddEditLinkModal={setShowAddEditLinkModal}
        props={props}
        hideXButton={hideXButton}
      />
    );
  }, [showAddEditLinkModal, setShowAddEditLinkModal, props, hideXButton]);

  const AddEditLinkButtonCallback = useCallback(() => {
    return (
      <AddEditLinkButton setShowAddEditLinkModal={setShowAddEditLinkModal} />
    );
  }, [setShowAddEditLinkModal]);

  return useMemo(
    () => ({
      setShowAddEditLinkModal,
      AddEditLinkModal: AddEditLinkModalCallback,
      AddEditLinkButton: AddEditLinkButtonCallback,
    }),
    [
      setShowAddEditLinkModal,
      AddEditLinkModalCallback,
      AddEditLinkButtonCallback,
    ],
  );
}
