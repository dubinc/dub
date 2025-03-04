"use client";

import { mutateSuffix } from "@/lib/swr/mutate";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { PartnerProfileLinkProps } from "@/lib/types";
import { Lock, X } from "@/ui/shared/icons";
import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  InfoTooltip,
  Modal,
  ShimmerDots,
  SimpleTooltipContent,
  Tooltip,
  useCopyToClipboard,
  useEnterSubmit,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { ArrowTurnLeft, Pen2, QRCode as QRCodeIcon } from "@dub/ui/icons";
import {
  cn,
  getDomainWithoutWWW,
  getPrettyUrl,
  linkConstructor,
} from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import type { QRCodeDesign } from "./partner-link-qr-modal";
import { usePartnerLinkQRModal } from "./partner-link-qr-modal";

interface PartnerLinkFormData {
  url: string;
  key: string;
  comments?: string;
}

interface PartnerLinkModalProps {
  link?: PartnerProfileLinkProps;
  isDefaultLink?: boolean;
  showPartnerLinkModal: boolean;
  setShowPartnerLinkModal: Dispatch<SetStateAction<boolean>>;
}

export function PartnerLinkModal({
  link,
  isDefaultLink,
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
        isDefaultLink={isDefaultLink}
        setShowPartnerLinkModal={setShowPartnerLinkModal}
      />
    </Modal>
  );
}

function QRCodePreview({
  programId,
  shortLink,
  shortLinkDomain,
  _key,
}: {
  programId: string;
  shortLink: string;
  shortLinkDomain: string;
  _key: string;
}) {
  const { isMobile } = useMediaQuery();
  const { programEnrollment } = useProgramEnrollment();
  const { logo } = programEnrollment?.program ?? {};

  const [data, setData] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-program-${programId}`,
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
    programId,
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
  isDefaultLink,
  setShowPartnerLinkModal,
}: {
  link?: PartnerProfileLinkProps;
  isDefaultLink?: boolean;
  setShowPartnerLinkModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { programEnrollment } = useProgramEnrollment();
  const destinationDomain =
    getDomainWithoutWWW(programEnrollment?.program?.url || "https://dub.co") ??
    "dub.co";
  const shortLinkDomain = programEnrollment?.program?.domain ?? "dub.sh";

  const [lockKey, setLockKey] = useState(Boolean(link));
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PartnerLinkFormData>({
    defaultValues: link
      ? {
          url: link.url.replace(`https://${destinationDomain}/`, ""),
          key: link.key,
          comments: link.comments ?? "",
        }
      : undefined,
  });

  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  const {
    register,
    watch,
    handleSubmit,
    formState: { isDirty },
  } = form;

  const { isMobile } = useMediaQuery();
  const [, copyToClipboard] = useCopyToClipboard();

  const [key, _url] = watch("key", "url");

  const saveDisabled = useMemo(
    () => Boolean(isLoading || (link && !isDirty)),
    [isLoading, link, isDirty],
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
              link ? `/${link.id}` : ""
            }`,
            {
              method: link ? "PATCH" : "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...data,
                url: linkConstructor({
                  domain: destinationDomain,
                  key: data.url,
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

          await mutateSuffix(`/links`);

          if (!link) {
            try {
              await copyToClipboard(result.shortLink);
              toast.success("Copied short link to clipboard!");
            } catch (err) {
              toast.success("Successfully created link!");
            }
          } else toast.success("Successfully updated short link!");

          setShowPartnerLinkModal(false);
        } finally {
          setIsLoading(false);
        }
      })}
    >
      <div className="flex flex-col items-start justify-between gap-6 px-6 py-4">
        <div className="flex w-full items-center justify-between">
          <h3 className="text-lg font-medium">
            {link ? "Edit Link" : "New Link"}
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
            {isDefaultLink ? (
              <Tooltip content="You cannot edit the default link destination">
                <div className="mt-2 block w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-neutral-500 sm:text-sm">
                  {getPrettyUrl(link?.url)}
                </div>
              </Tooltip>
            ) : (
              <div className="mt-2 flex rounded-md">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                  {destinationDomain}
                </span>
                <input
                  {...register("url", { required: false })}
                  type="text"
                  id="url"
                  placeholder="(optional)"
                  autoFocus={!isMobile}
                  onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
                    e.preventDefault();
                    // if pasting in a URL, extract the pathname
                    const text = e.clipboardData.getData("text/plain");
                    try {
                      const url = new URL(text);
                      e.currentTarget.value = url.pathname.slice(1);
                    } catch (err) {
                      e.currentTarget.value = text;
                    }
                  }}
                  className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                />
              </div>
            )}
          </div>

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
                  <Lock className="h-3 w-3" />
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
              programId={programEnrollment.program.id}
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
              {link ? "Save changes" : "Create link"}
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
