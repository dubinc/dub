"use client";

import { mutateSuffix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerProfileLinkProps } from "@/lib/types";
import { X } from "@/ui/shared/icons";
import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  Combobox,
  InfoTooltip,
  Modal,
  ShimmerDots,
  SimpleTooltipContent,
  useCopyToClipboard,
  useEnterSubmit,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import {
  ArrowTurnLeft,
  Pen2,
  PenWriting,
  QRCode as QRCodeIcon,
} from "@dub/ui/icons";
import {
  cn,
  getApexDomain,
  getDomainWithoutWWW,
  getPathnameFromUrl,
  // getPathnameFromUrl,
  linkConstructor,
  punycode,
} from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import { useParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import type { QRCodeDesign } from "./partner-link-qr-modal";
import { usePartnerLinkQRModal } from "./partner-link-qr-modal";

interface PartnerLinkFormData {
  key: string;
  pathname: string;
  comments?: string;
}

interface PartnerLinkModalProps {
  link?: PartnerProfileLinkProps;
  showPartnerLinkModal: boolean;
  setShowPartnerLinkModal: Dispatch<SetStateAction<boolean>>;
}

export function PartnerLinkModal({
  link,
  showPartnerLinkModal,
  setShowPartnerLinkModal,
}: PartnerLinkModalProps) {
  return (
    <Modal
      showModal={showPartnerLinkModal}
      setShowModal={setShowPartnerLinkModal}
      className="max-w-lg"
    >
      <PartnerLinkModalContent
        link={link}
        setShowPartnerLinkModal={setShowPartnerLinkModal}
      />
    </Modal>
  );
}

function QRCodePreview({
  shortLink,
  shortLinkDomain,
  _key,
}: {
  shortLink: string;
  shortLinkDomain: string;
  _key: string;
}) {
  const { isMobile } = useMediaQuery();
  const { programEnrollment } = useProgramEnrollment();
  const { logo } = programEnrollment?.program ?? {};

  const [data, setData] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-program-${programEnrollment?.program?.id}`,
    {
      fgColor: "#000000",
      logo: logo ?? undefined,
    },
  );

  const { LinkQRModal, setShowLinkQRModal } = usePartnerLinkQRModal({
    props: {
      domain: shortLinkDomain,
      key: _key,
    },
    onSave: (data) => setData(data),
  });

  return (
    <div>
      <LinkQRModal />
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium text-neutral-700">QR Code</h4>
        <InfoTooltip
          content={
            <SimpleTooltipContent
              title="Set a custom QR code design to improve click-through rates."
              cta="Learn more."
              href="https://dub.co/help/article/custom-qr-codes"
            />
          }
        />
      </div>
      <div className="relative mt-2 h-24 overflow-hidden rounded-md border border-neutral-300">
        <Button
          type="button"
          variant="secondary"
          icon={<Pen2 className="mx-px size-4" />}
          className="absolute right-2 top-2 z-10 h-8 w-fit bg-white px-1.5"
          onClick={() => setShowLinkQRModal(true)}
          disabled={!_key}
        />
        {!isMobile && (
          <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
        )}
        {_key ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={shortLink}
              initial={{ filter: "blur(2px)", opacity: 0.4 }}
              animate={{ filter: "blur(0px)", opacity: 1 }}
              exit={{ filter: "blur(2px)", opacity: 0.4 }}
              transition={{ duration: 0.1 }}
              className="relative flex size-full items-center justify-center"
            >
              <QRCode url={shortLink} scale={0.5} {...data} />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2">
            <QRCodeIcon className="size-5 text-neutral-700" />
            <p className="max-w-32 text-center text-xs text-neutral-700">
              Enter a short link to generate a QR code
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerLinkModalContent({
  link,
  setShowPartnerLinkModal,
}: {
  link?: PartnerProfileLinkProps;
  setShowPartnerLinkModal: Dispatch<SetStateAction<boolean>>;
}) {
  const isEditingLink = Boolean(link?.id); // When duplicating the id will be empty
  const isCreatingLink = !link;

  const { programSlug } = useParams();
  const { programEnrollment } = useProgramEnrollment();
  const [lockKey, setLockKey] = useState(isEditingLink);
  const [isLoading, setIsLoading] = useState(false);
  const [isExactMode, setIsExactMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);
  const { isMobile } = useMediaQuery();
  const [, copyToClipboard] = useCopyToClipboard();

  const { shortLinkDomain, additionalLinks } = useMemo(() => {
    return {
      shortLinkDomain: programEnrollment?.program?.domain ?? "dub.sh",
      additionalLinks: programEnrollment?.group?.additionalLinks ?? [],
    };
  }, [programEnrollment]);

  const destinationDomains = useMemo(
    () =>
      additionalLinks.map((link) =>
        link.validationMode === "domain"
          ? link.domain
          : getDomainWithoutWWW(link.url!),
      ),
    [additionalLinks],
  );

  const [destinationDomain, setDestinationDomain] = useState(
    link
      ? (getDomainWithoutWWW(link.url) as string)
      : destinationDomains?.[0] ?? null,
  );

  useEffect(() => {
    const additionalLink = additionalLinks.find(
      (link) => link.domain === destinationDomain,
    );

    setIsExactMode(additionalLink?.validationMode === "exact");
  }, [destinationDomain, additionalLinks]);

  const {
    register,
    watch,
    handleSubmit,
    setValue,
    formState: { isDirty },
  } = useForm<PartnerLinkFormData>({
    defaultValues: link
      ? {
          pathname: getPathnameFromUrl(link.url),
          key: link.key,
          comments: link.comments ?? "",
        }
      : undefined,
  });

  const [key, pathname] = watch(["key", "pathname"]);

  const saveDisabled = useMemo(
    () =>
      Boolean(
        isLoading ||
          (isEditingLink ? !isDirty : destinationDomains.length === 0),
      ),
    [isLoading, isEditingLink, isDirty, destinationDomains],
  );

  // we hide the destination URL input if:
  // 1. the link is a partner group default link
  // 2. there is only one destination domain and we are in exact mode
  const hideDestinationUrl = useMemo(
    () =>
      link?.partnerGroupDefaultLinkId ||
      (destinationDomains.length === 1 && isExactMode),
    [destinationDomains.length, isExactMode, link?.partnerGroupDefaultLinkId],
  );

  const shortLink = useMemo(
    () =>
      linkConstructor({
        domain: shortLinkDomain,
        key,
      }),
    [shortLinkDomain, key],
  );

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(async (data) => {
        setIsLoading(true);

        try {
          const response = await fetch(
            `/api/partner-profile/programs/${programEnrollment?.program?.id}/links${
              isEditingLink ? `/${link!.id}` : ""
            }`,
            {
              method: isEditingLink ? "PATCH" : "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...data,
                url: linkConstructor({
                  domain: destinationDomain,
                  key: getPathnameFromUrl(pathname),
                }),
              }),
            },
          );

          const result = await response.json();

          if (!response.ok) {
            const { error } = result;
            toast.error(error.message);
            return;
          }

          await Promise.all([
            mutateSuffix(`/api/partner-profile/programs/${programSlug}`),
            mutateSuffix("/links"),
          ]);

          if (isCreatingLink) {
            try {
              await copyToClipboard(result.shortLink);
              toast.success("Copied short link to clipboard!");
            } catch (err) {
              toast.success("Successfully created link!");
            }
          } else {
            toast.success("Successfully updated short link!");
          }

          setShowPartnerLinkModal(false);
        } finally {
          setIsLoading(false);
        }
      })}
    >
      <div className="flex flex-col items-start justify-between gap-6 px-6 py-4">
        <div className="flex w-full items-center justify-between">
          <h3 className="text-lg font-medium">
            {isEditingLink ? "Edit Link" : "New Link"}
          </h3>
          <button
            type="button"
            onClick={() => setShowPartnerLinkModal(false)}
            className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex w-full flex-col gap-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="key"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Short Link
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="This is the short link that will redirect to your destination URL."
                      cta="Learn more."
                      href="https://dub.co/help/article/how-to-create-link"
                    />
                  }
                />
              </div>
              {lockKey && (
                <button
                  className="flex h-5 items-center space-x-2 text-sm text-neutral-500 transition-all duration-75 hover:text-black active:scale-95"
                  type="button"
                  onClick={() => {
                    window.confirm(
                      "Updating your short link key could potentially break existing links. Are you sure you want to continue?",
                    ) && setLockKey(false);
                  }}
                >
                  <PenWriting className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                {shortLinkDomain}
              </span>
              <input
                {...register("key", { required: true })}
                type="text"
                id="key"
                autoFocus={!isMobile}
                disabled={lockKey}
                className={cn(
                  "block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  {
                    "cursor-not-allowed border border-neutral-300 bg-neutral-100 text-neutral-500":
                      lockKey,
                  },
                )}
                placeholder="short-link"
              />
            </div>
          </div>

          {!hideDestinationUrl && (
            <div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="url"
                  className="block text-sm font-medium text-neutral-700"
                >
                  Destination URL
                </label>
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title="The URL your users will get redirected to when they visit your short link."
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
                    disabled={isEditingLink}
                  />
                </div>
                <input
                  {...register("pathname", { required: false })}
                  type="text"
                  placeholder="(optional)"
                  disabled={isExactMode}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                    if (isExactMode) return;

                    e.preventDefault();
                    // if pasting in a URL, extract the pathname + query params
                    const text = e.clipboardData.getData("text/plain");
                    let newValue: string;
                    try {
                      const url = new URL(text);
                      newValue = url.pathname.slice(1) + url.search;
                    } catch (err) {
                      newValue = text;
                    }

                    // Use setValue to properly dirty the form
                    setValue("pathname", newValue, { shouldDirty: true });
                  }}
                  className={cn(
                    "z-0 block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:z-[1] focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    {
                      "cursor-not-allowed border bg-neutral-100 text-neutral-500":
                        isExactMode,
                    },
                  )}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="comments"
                className="block text-sm font-medium text-neutral-700"
              >
                Comments
              </label>
              <InfoTooltip
                content={
                  <SimpleTooltipContent
                    title="Use comments to add context to your short links – for you and your team."
                    cta="Learn more."
                    href="https://dub.co/help/article/link-comments"
                  />
                }
              />
            </div>
            <TextareaAutosize
              {...register("comments")}
              id="comments"
              minRows={3}
              className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              placeholder="Add comments (optional)"
              onKeyDown={handleKeyDown}
            />
          </div>

          {programEnrollment && (
            <QRCodePreview
              shortLink={shortLink}
              shortLinkDomain={shortLinkDomain}
              _key={key}
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end border-t border-neutral-200 bg-neutral-50 p-4">
        <Button
          type="submit"
          disabled={saveDisabled}
          loading={isLoading}
          text={
            <span className="flex items-center gap-2">
              {isEditingLink ? "Save changes" : "Create link"}
              <div className="rounded border border-white/20 p-1">
                <ArrowTurnLeft className="size-3.5" />
              </div>
            </span>
          }
          className="h-8 w-fit pl-2.5 pr-1.5"
        />
      </div>
    </form>
  );
}

function DestinationDomainCombobox({
  selectedDomain,
  setSelectedDomain,
  destinationDomains,
  disabled = false,
}: {
  selectedDomain?: string;
  setSelectedDomain: (domain: string) => void;
  destinationDomains: string[];
  disabled?: boolean;
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
        value: getApexDomain(domain),
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
          {
            "cursor-not-allowed bg-neutral-100 text-neutral-500": disabled,
          },
        ),
        disabled,
      }}
      optionClassName="sm:max-w-[225px]"
      shouldFilter={false}
      open={disabled ? false : isOpen}
      onOpenChange={disabled ? undefined : setIsOpen}
      onSearchChange={disabled ? undefined : setSearch}
    />
  );
}

export function usePartnerLinkModal(
  props?: Omit<
    PartnerLinkModalProps,
    "showPartnerLinkModal" | "setShowPartnerLinkModal"
  >,
) {
  const [showPartnerLinkModal, setShowPartnerLinkModal] = useState(false);

  const PartnerLinkModalCallback = useCallback(() => {
    return (
      <PartnerLinkModal
        showPartnerLinkModal={showPartnerLinkModal}
        setShowPartnerLinkModal={setShowPartnerLinkModal}
        {...props}
      />
    );
  }, [showPartnerLinkModal]);

  return useMemo(
    () => ({
      setShowPartnerLinkModal,
      PartnerLinkModal: PartnerLinkModalCallback,
    }),
    [setShowPartnerLinkModal, PartnerLinkModalCallback],
  );
}
