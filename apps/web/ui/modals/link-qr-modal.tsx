import { getQRAsCanvas, getQRAsSVGDataUri, getQRData } from "@/lib/qr";
import useWorkspace from "@/lib/swr/use-workspace";
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
  Switch,
  Tooltip,
  TooltipContent,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import {
  Check,
  Check2,
  Copy,
  Download,
  Hyperlink,
  Photo,
} from "@dub/ui/src/icons";
import { API_DOMAIN, cn, linkConstructor } from "@dub/utils";
import { DUB_QR_LOGO } from "@dub/utils/src/constants";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useId,
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
  hideLogo: boolean;
};

type LinkQRModalProps = {
  props: QRLinkProps;
  onSave?: (data: QRCodeDesign) => void;
};

function LinkQRModal(
  props: {
    showLinkQRModal: boolean;
    setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  } & LinkQRModalProps,
) {
  return (
    <Modal
      showModal={props.showLinkQRModal}
      setShowModal={props.setShowLinkQRModal}
      className="max-w-[500px]"
    >
      <LinkQRModalInner {...props} />
    </Modal>
  );
}

function LinkQRModalInner({
  props,
  onSave,
  showLinkQRModal,
  setShowLinkQRModal,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
} & LinkQRModalProps) {
  const { logo: workspaceLogo, plan, id: workspaceId, slug } = useWorkspace();
  const id = useId();
  const { isMobile } = useMediaQuery();

  const url = useMemo(() => {
    return props.key && props.domain
      ? linkConstructor({ key: props.key, domain: props.domain })
      : undefined;
  }, [props.key, props.domain]);

  const [dataPersisted, setDataPersisted] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-${workspaceId}`,
    {
      fgColor: "#000000",
      hideLogo: false,
    },
  );
  const [data, setData] = useState(dataPersisted);

  const logo = workspaceLogo && plan !== "free" ? workspaceLogo : DUB_QR_LOGO;

  const hideLogo = data.hideLogo && plan !== "free";

  const qrData = useMemo(
    () =>
      url
        ? getQRData({
            url,
            fgColor: data.fgColor,
            hideLogo,
            logo,
          })
        : null,
    [url, data, hideLogo, logo],
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">QR Code Design</h3>
        <div className="max-md:hidden">
          <Tooltip
            content={
              <div className="px-2 py-1 text-xs text-gray-700">
                Press <strong className="font-medium text-gray-950">Q</strong>{" "}
                to open this quickly
              </div>
            }
            side="right"
          >
            <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-gray-200 font-sans text-xs text-gray-950">
              Q
            </kbd>
          </Tooltip>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
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
                    <Download className="h-4 w-4 text-gray-500" />
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
                    <Copy className="h-4 w-4 text-gray-500" />
                  </ButtonTooltip>
                </div>
              </CopyPopover>
            </div>
          )}
        </div>
        <div className="relative mt-2 flex h-44 items-center justify-center overflow-hidden rounded-md border border-gray-300">
          {!isMobile && (
            <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
          )}
          {url && (
            <AnimatePresence mode="wait">
              <motion.div
                key={data.fgColor + data.hideLogo}
                initial={{ filter: "blur(2px)", opacity: 0.4 }}
                animate={{ filter: "blur(0px)", opacity: 1 }}
                exit={{ filter: "blur(2px)", opacity: 0.4 }}
                transition={{ duration: 0.1 }}
                className="relative flex size-full items-center justify-center"
              >
                <QRCode
                  url={url}
                  fgColor={data.fgColor}
                  hideLogo={data.hideLogo}
                  logo={logo}
                  scale={1}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Logo toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label
            className="text-sm font-medium text-gray-700"
            htmlFor={`${id}-show-logo`}
          >
            Logo
          </label>
          <InfoTooltip
            content={
              <SimpleTooltipContent
                title="Display your logo in the center of the QR code."
                cta="Learn more."
                href="https://dub.co/help/article/custom-qr-codes"
              />
            }
          />
        </div>
        <Switch
          id={`${id}-hide-logo`}
          checked={!data.hideLogo}
          fn={() => {
            setData((d) => ({ ...d, hideLogo: !d.hideLogo }));
          }}
          disabledTooltip={
            plan === "free" ? (
              <TooltipContent
                title="You need to be on the Pro plan and above to customize your QR Code logo."
                cta="Upgrade to Pro"
                href={slug ? `/${slug}/upgrade` : "https://dub.co/pricing"}
              />
            ) : undefined
          }
        />
      </div>

      {/* Color selector */}
      <div>
        <span className="block text-sm font-medium text-gray-700">
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
              className="block w-full rounded-r-md border-2 border-l-0 pl-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-black sm:text-sm"
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
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full transition-all",
                    isSelected
                      ? "ring-1 ring-black ring-offset-[3px]"
                      : "ring-black/10 hover:ring-4",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {isSelected && <Check2 className="size-4 text-white" />}
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
              className="rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
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
              className="rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
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
              className="rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
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

  const [copiedImage, setCopiedImage] = useState(false);
  const copyToClipboard = async () => {
    try {
      const canvas = await getQRAsCanvas(qrData, "image/png", true);
      (canvas as HTMLCanvasElement).toBlob(async function (blob) {
        // @ts-ignore
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2000);
        setOpenPopover(false);
      });
    } catch (e) {
      throw e;
    }
  };
  const [copiedURL, setCopiedURL] = useState(false);

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
            className="rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
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
              navigator.clipboard.writeText(
                `${API_DOMAIN}/qr?url=${linkConstructor({
                  key: props.key,
                  domain: props.domain,
                  searchParams: {
                    qr: "1",
                  },
                })}${qrData.hideLogo ? "&hideLogo=true" : ""}`,
              );
              toast.success("Copied QR code URL to clipboard!");
              setCopiedURL(true);
              setTimeout(() => setCopiedURL(false), 2000);
              setOpenPopover(false);
            }}
            className="rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
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

export function useLinkQRModal(props: LinkQRModalProps) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModalCallback = useCallback(() => {
    return (
      <LinkQRModal
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
