"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { LinkProps } from "@/lib/types";
import { DOMAINS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/domains";
import { Lock, Random } from "@/ui/shared/icons";
import {
  ButtonTooltip,
  Combobox,
  LinkedIn,
  LoadingCircle,
  Magic,
  Tooltip,
  Twitter,
  useKeyboardShortcut,
} from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/src/icons";
import {
  cn,
  DUB_DOMAINS,
  getApexDomain,
  linkConstructor,
  nanoid,
  punycode,
  truncate,
} from "@dub/utils";
import { useCompletion } from "ai/react";
import { TriangleAlert } from "lucide-react";
import posthog from "posthog-js";
import {
  forwardRef,
  HTMLProps,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { AlertCircleFill } from "../shared/icons";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";
import { useAvailableDomains } from "./use-available-domains";

type ShortLinkInputProps = {
  domain?: string;
  _key?: string;
  existingLinkProps?: Pick<LinkProps, "key">;
  error?: string;
  onChange: (data: { domain?: string; key?: string }) => void;
  data: Pick<LinkProps, "url" | "title" | "description">;
  saving: boolean;
  loading: boolean;
} & Omit<HTMLProps<HTMLInputElement>, "onChange" | "data">;

export const ShortLinkInputNew = forwardRef<
  HTMLInputElement,
  ShortLinkInputProps
>(
  (
    {
      domain,
      _key: key,
      existingLinkProps,
      error: errorProp,
      onChange,
      data,
      saving,
      loading,
      ...inputProps
    }: ShortLinkInputProps,
    ref,
  ) => {
    const existingLink = Boolean(existingLinkProps);

    const inputId = useId();
    const randomLinkedInNonce = useMemo(() => nanoid(8), []);

    const {
      id: workspaceId,
      slug,
      mutate: mutateWorkspace,
      exceededAI,
      nextPlan,
    } = useWorkspace();

    const [lockKey, setLockKey] = useState(existingLink);
    const [generatingRandomKey, setGeneratingRandomKey] = useState(false);

    const [keyError, setKeyError] = useState<string | null>(null);
    const error = keyError || errorProp;

    const generateRandomKey = async () => {
      setKeyError(null);
      setGeneratingRandomKey(true);
      const res = await fetch(
        `/api/links/random?domain=${domain}&workspaceId=${workspaceId}`,
      );
      const key = await res.json();
      onChange?.({ key });
      setGeneratingRandomKey(false);
    };

    const runKeyChecks = async (value: string) => {
      const res = await fetch(
        `/api/links/verify?domain=${domain}&key=${value}&workspaceId=${workspaceId}`,
      );
      const { error } = await res.json();
      if (error) {
        setKeyError(error.message);
      } else {
        setKeyError(null);
      }
    };

    const [generatedKeys, setGeneratedKeys] = useState<string[]>(
      existingLink && key ? [key] : [],
    );

    const {
      completion,
      isLoading: generatingAIKey,
      complete,
    } = useCompletion({
      api: `/api/ai/completion?workspaceId=${workspaceId}`,
      onError: (error) => {
        if (error.message.includes("Upgrade to Pro")) {
          toast.custom(() => (
            <UpgradeRequiredToast
              title="You've exceeded your AI usage limit"
              message={error.message}
            />
          ));
        } else {
          toast.error(error.message);
        }
      },
      onFinish: (_, completion) => {
        setGeneratedKeys((prev) => [...prev, completion]);
        mutateWorkspace();
        runKeyChecks(completion);
        posthog.capture("ai_key_generated", {
          key: completion,
          url: data.url,
        });
      },
    });

    useEffect(() => {
      if (completion) onChange?.({ key: completion });
    }, [completion]);

    const generateAIKey = useCallback(async () => {
      setKeyError(null);
      complete(
        `For the following URL, suggest a relevant short link slug that is at most ${Math.max(25 - (domain?.length || 0), 12)} characters long. 
                  
            - URL: ${data.url}
            - Meta title: ${data.title}
            - Meta description: ${data.description}. 
    
          Only respond with the short link slug and nothing else. Don't use quotation marks or special characters (dash and slash are allowed).
          
          Make sure your answer does not exist in this list of generated slugs: ${generatedKeys.join(", ")}`,
      );
    }, [data.url, data.title, data.description, generatedKeys]);

    const shortLink = useMemo(() => {
      return linkConstructor({
        key,
        domain: domain,
        pretty: true,
      });
    }, [key, domain]);

    return (
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            Short Link
          </label>
          {lockKey ? (
            <button
              className="flex h-6 items-center space-x-2 text-sm text-gray-500 transition-all duration-75 hover:text-black active:scale-95"
              type="button"
              onClick={() => {
                window.confirm(
                  "Editing an existing short link could potentially break existing links. Are you sure you want to continue?",
                ) && setLockKey(false);
              }}
            >
              <Lock className="h-3 w-3" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <ButtonTooltip
                tabIndex={-1}
                tooltipProps={{
                  content: "Generate a random key",
                }}
                onClick={generateRandomKey}
                disabled={generatingRandomKey || generatingAIKey}
              >
                {generatingRandomKey ? (
                  <LoadingCircle />
                ) : (
                  <Random className="h-3 w-3" />
                )}
              </ButtonTooltip>
              <ButtonTooltip
                tabIndex={-1}
                tooltipProps={{
                  content: exceededAI
                    ? "You've exceeded your AI usage limit."
                    : !data.url
                      ? "Enter a URL to generate a key using AI."
                      : "Generate a key using AI.",
                }}
                onClick={generateAIKey}
                disabled={
                  generatingRandomKey ||
                  generatingAIKey ||
                  exceededAI ||
                  !data.url
                }
              >
                {generatingAIKey ? (
                  <LoadingCircle />
                ) : (
                  <Magic className="h-4 w-4" />
                )}
              </ButtonTooltip>
            </div>
          )}
        </div>
        <div className="relative mt-1 flex rounded-md shadow-sm">
          <div className="z-[1]">
            <DomainCombobox
              domain={domain}
              setDomain={(domain) => {
                setKeyError(null);
                onChange?.({ domain });
              }}
              loading={loading}
            />
          </div>
          <input
            ref={ref}
            type="text"
            name="key"
            id={inputId}
            // allow letters, numbers, '-', '_', '/', '.', and emojis
            pattern="[\p{L}\p{N}\p{Pd}\/\p{Emoji}_.]+"
            onInvalid={(e) => {
              e.currentTarget.setCustomValidity(
                "Only letters, numbers, '-', '_', '/', and emojis are allowed.",
              );
            }}
            onBlur={(e) => {
              // if the key is changed, check if key exists
              if (e.target.value && existingLinkProps?.key !== e.target.value) {
                runKeyChecks(e.target.value);
              } else if (
                domain &&
                workspaceId &&
                data.url.length > 0 &&
                !saving
              ) {
                generateRandomKey();
              }
            }}
            disabled={lockKey}
            autoComplete="off"
            autoCapitalize="none"
            className={cn(
              "block w-full rounded-r-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm",
              "z-0 focus:z-[1]",
              {
                "border-red-300 pr-10 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500":
                  error,
                "border-amber-300 pr-10 text-amber-900 placeholder-amber-300 focus:border-amber-500 focus:ring-amber-500":
                  shortLink.length > 25,
                "cursor-not-allowed border border-gray-300 bg-gray-100 text-gray-500":
                  lockKey,
              },
            )}
            placeholder="(optional)"
            aria-invalid="true"
            aria-describedby="key-error"
            value={punycode(key)}
            onChange={(e) => {
              setKeyError(null);
              e.currentTarget.setCustomValidity("");
              onChange?.({ key: e.target.value });
            }}
            {...inputProps}
          />
          {(error || shortLink.length > 25) && (
            <Tooltip
              content={
                error || (
                  <div className="flex max-w-xs items-start space-x-2 bg-white p-4">
                    <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-amber-500" />
                    <div>
                      <p className="text-sm text-gray-700">
                        Short links longer than 25 characters will show up
                        differently on some platforms.
                      </p>
                      <div className="mt-2 flex items-center space-x-2">
                        <LinkedIn className="h-4 w-4" />
                        <p className="cursor-pointer text-sm font-semibold text-[#4783cf] hover:underline">
                          {linkConstructor({
                            domain: "lnkd.in",
                            key: randomLinkedInNonce,
                            pretty: true,
                          })}
                        </p>
                      </div>
                      {shortLink.length > 25 && (
                        <div className="mt-1 flex items-center space-x-2">
                          <Twitter className="h-4 w-4" />
                          <p className="cursor-pointer text-sm text-[#34a2f1] hover:underline">
                            {truncate(shortLink, 25)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
            >
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {error ? (
                  <AlertCircleFill
                    className="h-5 w-5 text-red-500"
                    aria-hidden="true"
                  />
                ) : shortLink.length > 25 ? (
                  <AlertCircleFill className="h-5 w-5 text-amber-500" />
                ) : null}
              </div>
            </Tooltip>
          )}
        </div>
        {error ? (
          error.includes("Upgrade to") ? (
            <p className="mt-2 text-sm text-red-600" id="key-error">
              {error.split(`Upgrade to ${nextPlan.name}`)[0]}
              <a className="cursor-pointer underline" href={`/${slug}/upgrade`}>
                Upgrade to {nextPlan.name}
              </a>
              {error.split(`Upgrade to ${nextPlan.name}`)[1]}
            </p>
          ) : (
            <p className="mt-2 text-sm text-red-600" id="key-error">
              {error}
            </p>
          )
        ) : (
          <DefaultDomainPrompt
            domain={domain}
            url={data.url}
            onChange={(domain) => onChange({ domain })}
          />
        )}
      </div>
    );
  },
);

function DefaultDomainPrompt({
  domain,
  url,
  onChange,
}: {
  domain?: string;
  url?: string;
  onChange: (domain: string) => void;
}) {
  if (!url || !domain) return null;

  const apexDomain = getApexDomain(url);
  const hostnameFor = DUB_DOMAINS.find((domain) =>
    domain?.allowedHostnames?.includes(apexDomain),
  );
  const domainSlug = hostnameFor?.slug;

  if (!domainSlug || domain === domainSlug) return null;

  return (
    <button
      className="flex items-center gap-1 p-2 text-xs text-gray-500 transition-all duration-75 hover:text-gray-700 active:scale-[0.98]"
      onClick={() => onChange(domainSlug)}
      type="button"
    >
      <ArrowTurnRight2 className="size-3.5" />
      <p>
        Use <strong className="font-semibold">{domainSlug}</strong> domain
        instead?
      </p>
    </button>
  );
}

function DomainCombobox({
  domain,
  setDomain,
  loading,
}: {
  domain?: string;
  setDomain: (domain: string) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  // Whether to fetch search results from the backend
  const [useAsync, setUseAsync] = useState(false);

  const {
    domains,
    allWorkspaceDomains,
    loading: loadingDomains,
  } = useAvailableDomains({
    search: useAsync ? debouncedSearch : undefined,
  });

  useEffect(() => {
    if (
      allWorkspaceDomains &&
      !useAsync &&
      allWorkspaceDomains.length >= DOMAINS_MAX_PAGE_SIZE
    )
      setUseAsync(true);
  }, [allWorkspaceDomains, useAsync]);

  const [isOpen, setIsOpen] = useState(false);

  useKeyboardShortcut("d", () => setIsOpen(true), { modal: true });

  const options = useMemo(
    () =>
      loadingDomains
        ? undefined
        : domains?.map(({ slug }) => ({
            value: slug,
            label: punycode(slug),
          })),
    [loadingDomains, domains],
  );

  return (
    <Combobox
      selected={
        domain && !loading
          ? {
              value: domain,
              label: punycode(domain),
            }
          : null
      }
      setSelected={(option) => {
        if (!option) return;
        setDomain(option.value);
      }}
      options={options}
      caret={true}
      placeholder={
        loading ? (
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        ) : (
          "Domain"
        )
      }
      searchPlaceholder="Search domains..."
      shortcutHint="D"
      buttonProps={{
        className: cn(
          "w-32 sm:w-40 h-full rounded-r-none border-r-transparent justify-start px-2.5",
          "data-[state=open]:ring-1 data-[state=open]:ring-gray-500 data-[state=open]:border-gray-500",
          "focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition-none",
        ),
      }}
      optionClassName="sm:max-w-[225px]"
      shouldFilter={!useAsync}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
    />
  );
}
