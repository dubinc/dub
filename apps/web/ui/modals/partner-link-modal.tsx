"use client";

import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  InfoTooltip,
  Modal,
  ShimmerDots,
  SimpleTooltipContent,
  useEnterSubmit,
  useKeyboardShortcut,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { Pen2, QRCode as QRCodeIcon } from "@dub/ui/icons";
import { getDomainWithoutWWW, linkConstructor } from "@dub/utils";
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
import type { QRCodeDesign } from "./partner-link-qr-modal";
import { usePartnerLinkQRModal } from "./partner-link-qr-modal";

interface PartnerLinkFormData {
  url: string;
  key: string;
  comments?: string;
}

interface PartnerLinkModalProps {
  showPartnerLinkModal: boolean;
  setShowPartnerLinkModal: Dispatch<SetStateAction<boolean>>;
}

export function PartnerLinkModal({
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
  const { programEnrollment } = useProgramEnrollment();
  const { isMobile } = useMediaQuery();

  const [data, setData] = useLocalStorage<QRCodeDesign>(
    `partner-qr-code-design-${programEnrollment?.program?.id}`,
    {
      fgColor: "#000000",
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
              <QRCode
                url={shortLink}
                scale={0.5}
                hideLogo
                fgColor={data.fgColor}
              />
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
  setShowPartnerLinkModal,
}: {
  setShowPartnerLinkModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { isMobile } = useMediaQuery();

  const { programEnrollment } = useProgramEnrollment();
  const destinationDomain = getDomainWithoutWWW(
    programEnrollment?.program?.url || "https://dub.co",
  );
  const shortLinkDomain = programEnrollment?.program?.domain || "dub.sh";

  const form = useForm<PartnerLinkFormData>();
  const formRef = useRef<HTMLFormElement>(null);
  const { handleKeyDown } = useEnterSubmit(formRef);

  const {
    register,
    watch,
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const [url, key] = watch(["url", "key"]);

  const shortLink = useMemo(
    () =>
      linkConstructor({
        domain: shortLinkDomain,
        key,
      }),
    [shortLinkDomain, key],
  );

  const { LinkQRModal, setShowLinkQRModal } = usePartnerLinkQRModal({
    props: {
      domain: shortLinkDomain,
      key,
    },
  });

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit(async (data) => {
        // TODO: Implement link creation
        console.log("Creating link:", data);
        setShowPartnerLinkModal(false);
      })}
    >
      <LinkQRModal />
      <div className="flex flex-col items-start justify-between gap-6 px-6 py-4">
        <h3 className="text-lg font-medium">New Link</h3>

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
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                {destinationDomain}/
              </span>
              <input
                {...register("url", { required: false })}
                type="text"
                id="url"
                placeholder="(optional)"
                className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
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
            <div className="mt-2 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 text-neutral-500 sm:text-sm">
                {shortLinkDomain}/
              </span>
              <input
                {...register("key", { required: true })}
                type="text"
                id="key"
                className="block w-full rounded-r-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
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

          <QRCodePreview
            shortLink={shortLink}
            shortLinkDomain={shortLinkDomain}
            _key={key}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 p-4">
        <Button
          text="Cancel"
          variant="secondary"
          onClick={() => setShowPartnerLinkModal(false)}
        />
        <Button
          text={isSubmitting ? "Creating..." : "Create Link"}
          loading={isSubmitting}
          type="submit"
        />
      </div>
    </form>
  );
}

export function usePartnerLinkModal() {
  const [showPartnerLinkModal, setShowPartnerLinkModal] = useState(false);

  useKeyboardShortcut("c", () => setShowPartnerLinkModal(true));

  const PartnerLinkModalCallback = useCallback(() => {
    return (
      <PartnerLinkModal
        showPartnerLinkModal={showPartnerLinkModal}
        setShowPartnerLinkModal={setShowPartnerLinkModal}
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
