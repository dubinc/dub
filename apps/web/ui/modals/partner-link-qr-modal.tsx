import { getQRAsCanvas, getQRAsSVGDataUri, getQRData } from "@/lib/qr";
import useProgramEnrollment from "@/lib/swr/use-program-enrollment";
import { QRLinkProps } from "@/lib/types";
import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  ButtonTooltip,
  IconMenu,
  InfoTooltip,
  Modal,
  Popover,
  ShimmerDots,
  SimpleTooltipContent,
  Tooltip,
  useCopyToClipboard,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { Check, Copy, Download, Hyperlink, Photo } from "@dub/ui/icons";
import { API_DOMAIN, linkConstructor } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

const DEFAULT_COLORS = [
  "#000000",
  "#C73E33",
  "#DF6547",
  "#F4B3D7",
  "#F6CF54",
  "#49A065",
  "#2146B7",
  "#AE49BF",
];

export type QRCodeDesign = {
  fgColor: string;
  logo?: string;
};

type PartnerLinkQRModalProps = {
  props: QRLinkProps;
  programId: string;
  onSave?: (data: QRCodeDesign) => void;
};

function PartnerLinkQRModal(
  props: {
    showLinkQRModal: boolean;
    setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  } & PartnerLinkQRModalProps,
) {
  return (
    <Modal
      showModal={props.showLinkQRModal}
      setShowModal={props.setShowLinkQRModal}
      className="max-w-[500px]"
    >
      <PartnerLinkQRModalInner {...props} />
    </Modal>
  );
}

function PartnerLinkQRModalInner({
  props,
  programId,
  onSave,
  setShowLinkQRModal,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
} & PartnerLinkQRModalProps) {
  const { isMobile } = useMediaQuery();
  const { programEnrollment } = useProgramEnrollment();
  const { logo } = programEnrollment?.program ?? {};

  const url = useMemo(() => {
    return props.key && props.domain
      ? linkConstructor({ key: props.key, domain: props.domain })
      : undefined;
  }, [props.key, props.domain]);

  const [dataPersisted, setDataPersisted] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-program-${programId}`,
    {
      fgColor: "#000000",
      logo: logo ?? undefined,
    },
  );

  const [data, setData] = useState(dataPersisted);

  const qrData = useMemo(
    () =>
      url
        ? getQRData({
            url,
            fgColor: data.fgColor,
            logo: logo ?? undefined,
          })
        : null,
    [url, data, logo],
  );

  const onColorChange = useDebouncedCallback(
    (color: string) => setData((d) => ({ ...d, fgColor: color })),
    500,
  );

  return (
    <form
      className="flex flex-col gap-6 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowLinkQRModal(false);
        setDataPersisted(data);
        onSave?.(data);
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-medium">QR Code</h3>
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

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700">
              QR Code Preview
            </span>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Customize your QR code to fit your brand."
                  cta="Learn more."
                  href="https://dub.co/help/article/custom-qr-codes"
                />
              }
            />
          </div>
          {url && qrData && (
            <div className="flex items-center gap-2">
              <DownloadPopover qrData={qrData} props={props}>
                <div>
                  <ButtonTooltip
                    tooltipProps={{
                      content: "Download QR code",
                    }}
                  >
                    <Download className="h-4 w-4 text-neutral-500" />
                  </ButtonTooltip>
                </div>
              </DownloadPopover>
              <CopyPopover qrData={qrData} props={props}>
                <div>
                  <ButtonTooltip
                    tooltipProps={{
                      content: "Copy QR code",
                    }}
                  >
                    <Copy className="h-4 w-4 text-neutral-500" />
                  </ButtonTooltip>
                </div>
              </CopyPopover>
            </div>
          )}
        </div>
        <div className="relative mt-2 flex h-44 items-center justify-center overflow-hidden rounded-md border border-neutral-300">
          {!isMobile && (
            <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
          )}
          {url && (
            <AnimatePresence mode="wait">
              <motion.div
                key={data.fgColor}
                initial={{ filter: "blur(2px)", opacity: 0.4 }}
                animate={{ filter: "blur(0px)", opacity: 1 }}
                exit={{ filter: "blur(2px)", opacity: 0.4 }}
                transition={{ duration: 0.1 }}
                className="relative flex size-full items-center justify-center"
              >
                <QRCode url={url} scale={1} {...data} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Color selector */}
      <div>
        <span className="block text-sm font-medium text-neutral-700">
          QR Code Color
        </span>
        <div className="mt-2 flex gap-6">
          <div className="relative flex h-9 w-32 shrink-0 rounded-md shadow-sm">
            <Tooltip
              content={
                <div className="flex max-w-xs flex-col items-center space-y-3 p-5 text-center">
                  <HexColorPicker
                    color={data.fgColor}
                    onChange={onColorChange}
                  />
                </div>
              }
            >
              <div
                className="h-full w-12 rounded-l-md border"
                style={{
                  backgroundColor: data.fgColor,
                  borderColor: data.fgColor,
                }}
              />
            </Tooltip>
            <HexColorInput
              id="color"
              name="color"
              color={data.fgColor}
              onChange={onColorChange}
              prefixed
              style={{ borderColor: data.fgColor }}
              className="block w-full rounded-r-md border-2 border-l-0 pl-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-black sm:text-sm"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {DEFAULT_COLORS.map((color) => {
              const isSelected = data.fgColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setData((d) => ({ ...d, fgColor: color }))}
                  className={`flex size-7 items-center justify-center rounded-full transition-all ${
                    isSelected
                      ? "ring-1 ring-black ring-offset-[3px]"
                      : "ring-black/10 hover:ring-4"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && <Check className="size-4 text-white" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          text="Cancel"
          className="h-9 w-fit"
          onClick={() => {
            setShowLinkQRModal(false);
          }}
        />
        <Button
          type="submit"
          variant="primary"
          text="Save changes"
          className="h-9 w-fit"
        />
      </div>
    </form>
  );
}

function DownloadPopover({
  qrData,
  props,
  children,
}: PropsWithChildren<{
  qrData: ReturnType<typeof getQRData>;
  props: QRLinkProps;
}>) {
  const anchorRef = useRef<HTMLAnchorElement>(null);

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${props.key}-qrcode.${extension}`;
    anchorRef.current.click();
    setOpenPopover(false);
  }

  const [openPopover, setOpenPopover] = useState(false);

  return (
    <div>
      <Popover
        content={
          <div className="grid p-1 sm:min-w-48">
            <button
              type="button"
              onClick={async () => {
                download(await getQRAsSVGDataUri(qrData), "svg");
              }}
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download SVG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
            <button
              type="button"
              onClick={async () => {
                download(
                  (await getQRAsCanvas(qrData, "image/png")) as string,
                  "png",
                );
              }}
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download PNG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
            <button
              type="button"
              onClick={async () => {
                download(
                  (await getQRAsCanvas(qrData, "image/jpeg")) as string,
                  "jpg",
                );
              }}
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download JPEG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
          </div>
        }
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        {children}
      </Popover>
      {/* This will be used to prompt downloads. */}
      <a
        className="hidden"
        download={`${props.key}-qrcode.svg`}
        ref={anchorRef}
      />
    </div>
  );
}

function CopyPopover({
  qrData,
  props,
  children,
}: PropsWithChildren<{
  qrData: ReturnType<typeof getQRData>;
  props: QRLinkProps;
}>) {
  const [openPopover, setOpenPopover] = useState(false);
  const [copiedURL, copyUrlToClipboard] = useCopyToClipboard(2000);
  const [copiedImage, copyImageToClipboard] = useCopyToClipboard(2000);

  const copyToClipboard = async () => {
    try {
      const canvas = await getQRAsCanvas(qrData, "image/png", true);
      (canvas as HTMLCanvasElement).toBlob(async function (blob) {
        // @ts-ignore
        const item = new ClipboardItem({ "image/png": blob });
        await copyImageToClipboard(item);
        setOpenPopover(false);
      });
    } catch (e) {
      throw e;
    }
  };

  return (
    <Popover
      content={
        <div className="grid p-1 sm:min-w-48">
          <button
            type="button"
            onClick={async () => {
              toast.promise(copyToClipboard, {
                loading: "Copying QR code to clipboard...",
                success: "Copied QR code to clipboard!",
                error: "Failed to copy",
              });
            }}
            className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
          >
            <IconMenu
              text="Copy Image"
              icon={
                copiedImage ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Photo className="h-4 w-4" />
                )
              }
            />
          </button>
          <button
            type="button"
            onClick={() => {
              const url = `${API_DOMAIN}/qr?url=${linkConstructor({
                key: props.key,
                domain: props.domain,
                searchParams: {
                  qr: "1",
                },
              })}`;
              toast.promise(copyUrlToClipboard(url), {
                success: "Copied QR code URL to clipboard!",
              });
              setOpenPopover(false);
            }}
            className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
          >
            <IconMenu
              text="Copy URL"
              icon={
                copiedURL ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Hyperlink className="h-4 w-4" />
                )
              }
            />
          </button>
        </div>
      }
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      {children}
    </Popover>
  );
}

export function usePartnerLinkQRModal(props: PartnerLinkQRModalProps) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModalCallback = useCallback(() => {
    return (
      <PartnerLinkQRModal
        showLinkQRModal={showLinkQRModal}
        setShowLinkQRModal={setShowLinkQRModal}
        {...props}
      />
    );
  }, [showLinkQRModal, setShowLinkQRModal]);

  return useMemo(
    () => ({
      setShowLinkQRModal,
      LinkQRModal: LinkQRModalCallback,
    }),
    [setShowLinkQRModal, LinkQRModalCallback],
  );
}
