import { mutateSuffix } from "@/lib/swr/mutate";
import { PartnerGroupAdditionalLink, PartnerGroupProps } from "@/lib/types";
import { Lock } from "@/ui/shared/icons";
import {
  Button,
  Combobox,
  InfoTooltip,
  SimpleTooltipContent,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import {
  cn,
  getApexDomain,
  getUrlWithoutUTMParams,
  linkConstructor,
  punycode,
  regexEscape,
  TAB_ITEM_ANIMATION_SETTINGS,
} from "@dub/utils";
import { Program } from "@prisma/client";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { useEmbedToken } from "../use-embed-token";
import { ReferralsEmbedLink } from "./types";

interface Props {
  program: Pick<Program, "domain" | "url">;
  group: Pick<PartnerGroupProps, "id" | "additionalLinks" | "maxPartnerLinks">;
  link?: ReferralsEmbedLink | null;
  onCancel: () => void;
}

interface FormData {
  url: string;
  key: string;
}

export function ReferralsEmbedCreateUpdateLink({
  program,
  group,
  link,
  onCancel,
}: Props) {
  const token = useEmbedToken();
  const { isMobile } = useMediaQuery();
  const [, copyToClipboard] = useCopyToClipboard();
  const [lockKey, setLockKey] = useState(Boolean(link));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExactMode, setIsExactMode] = useState(false);

  const shortLinkDomain = program.domain || "";
  const additionalLinks: PartnerGroupAdditionalLink[] =
    group.additionalLinks ?? [];

  const destinationDomains = useMemo(
    () => additionalLinks.map((link) => link.domain),
    [additionalLinks],
  );

  const [destinationDomain, setDestinationDomain] = useState(
    link ? getApexDomain(link.url) : destinationDomains?.[0] ?? null,
  );

  useEffect(() => {
    const additionalLink = additionalLinks.find(
      (link) => link.domain === destinationDomain,
    );

    setIsExactMode(additionalLink?.validationMode === "exact");
  }, [destinationDomain, additionalLinks]);

  const {
    watch,
    setValue,
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: link
      ? {
          url: getUrlWithoutUTMParams(link.url).replace(
            new RegExp(`^https?:\/\/${regexEscape(destinationDomain)}\/?`),
            "",
          ),
          key: link.key,
        }
      : undefined,
  });

  const key = watch("key");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const endpoint = !link
        ? "/api/embed/referrals/links"
        : `/api/embed/referrals/links/${link.id}`;

      const response = await fetch(endpoint, {
        method: !link ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          url: isExactMode
            ? undefined
            : linkConstructor({
                domain: destinationDomain,
                key: data.url,
              }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMessage(result.error.message);
        return;
      }

      if (!link) {
        copyToClipboard(result.shortLink);
      }

      await mutateSuffix("api/embed/referrals/links");
      onCancel();
    } catch (error) {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDisabled = useMemo(
    () => Boolean(isSubmitting || (!link ? !key : !isDirty)),
    [isSubmitting, key, isDirty, link],
  );

  // If there is only one destination domain and we are in exact mode, hide the destination URL input
  const hideDestinationUrl = useMemo(
    () => destinationDomains.length === 1 && isExactMode,
    [destinationDomains.length, isExactMode],
  );

  return (
    <motion.div
      className="border-border-subtle bg-bg-default relative rounded-md border"
      {...TAB_ITEM_ANIMATION_SETTINGS}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[26rem] overflow-auto"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
          <span className="text-content-default text-base font-semibold">
            {!link ? "New link" : "Edit link"}
          </span>
          <div className="flex items-center gap-x-2">
            <Button
              text="Cancel"
              variant="secondary"
              type="button"
              className="h-8 px-3"
              onClick={onCancel}
            />
            <Button
              text={!link ? "Create link" : "Update link"}
              variant="primary"
              loading={isSubmitting}
              disabled={saveDisabled}
              className="h-8 px-3"
            />
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="short-link"
                  className="text-content-default block text-sm font-medium"
                >
                  Short link
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="The URL that will be shared with your users. Keep it short and memorable!"
                      cta="Learn more."
                      href="https://dub.co/help/article/how-to-create-link"
                    />
                  }
                />
              </div>

              {lockKey && (
                <button
                  className="flex h-5 items-center space-x-2 text-sm text-neutral-500 transition-all duration-75 hover:text-black active:scale-95 dark:text-neutral-400 dark:hover:text-white"
                  type="button"
                  onClick={() => {
                    window.confirm(
                      "Updating your short link key could potentially break existing links. Are you sure you want to continue?",
                    ) && setLockKey(false);
                  }}
                >
                  <Lock className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                {shortLinkDomain}
              </span>
              <input
                type="text"
                placeholder="another-link"
                autoFocus={!isMobile}
                className={cn(
                  "border-border-default text-content-default bg-bg-default block w-full rounded-r-md placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm dark:placeholder-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400",
                  {
                    "cursor-not-allowed bg-neutral-50 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400":
                      lockKey,
                  },
                )}
                {...register("key", { required: true })}
                disabled={lockKey}
              />
            </div>

            {errorMessage && (
              <div className="mt-2 flex justify-end">
                <span className="text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </span>
              </div>
            )}
          </div>

          {!hideDestinationUrl && (
            <div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="url"
                  className="text-content-default block text-sm font-medium"
                >
                  Destination URL
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="The URL your users will get redirected to when they visit your referral link."
                      cta="Learn more."
                      href="https://dub.co/help/article/how-to-create-link"
                    />
                  }
                />
              </div>
              <div className="relative mt-1 flex rounded-md shadow-sm">
                <div className="z-[1]">
                  <DestinationDomainCombobox
                    selectedDomain={destinationDomain}
                    setSelectedDomain={setDestinationDomain}
                    destinationDomains={destinationDomains}
                  />
                </div>
                <input
                  type="text"
                  placeholder="(optional)"
                  disabled={isExactMode}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                    if (isExactMode) return;

                    e.preventDefault();
                    // if pasting in a URL, extract the pathname
                    const text = e.clipboardData.getData("text/plain");
                    try {
                      const url = new URL(text);
                      e.currentTarget.value = url.pathname.slice(1);
                    } catch (err) {
                      e.currentTarget.value = text;
                    }

                    setValue("url", e.currentTarget.value, {
                      shouldDirty: true,
                    });
                  }}
                  className={cn(
                    "z-0 block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:z-[1] focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    {
                      "cursor-not-allowed border bg-neutral-100 text-neutral-500":
                        isExactMode,
                    },
                  )}
                  {...register("url", { required: !isExactMode })}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </motion.div>
  );
}

function DestinationDomainCombobox({
  selectedDomain,
  setSelectedDomain,
  destinationDomains,
}: {
  selectedDomain?: string;
  setSelectedDomain: (domain: string) => void;
  destinationDomains: string[];
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(() => {
    const allDomains = selectedDomain
      ? [
          selectedDomain,
          ...destinationDomains.filter((d) => d !== selectedDomain),
        ]
      : destinationDomains;

    if (!debouncedSearch) {
      return allDomains.map((domain) => ({
        value: domain,
        label: punycode(domain),
      }));
    }

    return allDomains
      .filter((domain) =>
        punycode(domain).toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
      .map((domain) => ({
        value: domain,
        label: punycode(domain),
      }));
  }, [selectedDomain, destinationDomains, debouncedSearch]);

  return (
    <Combobox
      selected={
        selectedDomain
          ? {
              value: selectedDomain,
              label: punycode(selectedDomain),
            }
          : null
      }
      setSelected={(option) => {
        if (!option) return;
        setSelectedDomain(option.value);
      }}
      options={options}
      caret={true}
      placeholder="Select domain..."
      searchPlaceholder="Search domains..."
      buttonProps={{
        className: cn(
          "w-32 sm:w-40 h-full rounded-r-none border-r-transparent justify-start px-2.5",
          "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
          "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
        ),
      }}
      optionClassName="sm:max-w-[225px]"
      shouldFilter={false}
      open={isOpen}
      onOpenChange={setIsOpen}
      onSearchChange={setSearch}
    />
  );
}
