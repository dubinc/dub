"use client";

import { QRCodeSVG, getQRAsCanvas, getQRAsSVGDataUri } from "@/lib/qr";
import useWorkspace from "@/lib/swr/use-workspace";
import { QRLinkProps } from "@/lib/types";
import { Clipboard, Download } from "@/ui/shared/icons";
import {
  IconMenu,
  InfoTooltip,
  LinkLogo,
  Modal,
  Photo,
  Popover,
  SimpleTooltipContent,
  Switch,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import {
  APP_HOSTNAMES,
  FADE_IN_ANIMATION_SETTINGS,
  getApexDomain,
  linkConstructor,
} from "@dub/utils";
import { motion } from "framer-motion";
import { Check, ChevronRight, Link2 } from "lucide-react";
import { useParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

function LinkQRModalHelper({
  showLinkQRModal,
  setShowLinkQRModal,
  props,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  props: QRLinkProps;
}) {
  return (
    <Modal showModal={showLinkQRModal} setShowModal={setShowLinkQRModal}>
      <QRCodePicker props={props} setShowLinkQRModal={setShowLinkQRModal} />
    </Modal>
  );
}

export function QRCodePicker({
  props,
  setShowLinkQRModal,
}: {
  props: QRLinkProps;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
}) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const { logo, plan } = useWorkspace();
  const apexDomain = props.url ? getApexDomain(props.url) : null;

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${props.key}-qrcode.${extension}`;
    anchorRef.current.click();
  }

  const [showLogo, setShowLogo] = useState(true);
  const [fgColor, setFgColor] = useState("#000000");

  const qrData = useMemo(
    () => ({
      value: linkConstructor({
        key: props.key,
        domain: props.domain,
        searchParams: {
          qr: "1",
        },
      }),
      bgColor: "#ffffff",
      fgColor,
      size: 1024,
      level: "Q", // QR Code error correction level: https://blog.qrstuff.com/general/qr-code-error-correction
      includeMargin: true,
      ...(showLogo && {
        imageSettings: {
          src:
            logo && plan !== "free" ? logo : "https://assets.dub.co/logo.png",
          height: 256,
          width: 256,
          excavate: true,
        },
      }),
    }),
    [props, fgColor, showLogo],
  );

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
      });
    } catch (e) {
      throw e;
    }
  };
  const [copiedURL, setCopiedURL] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 px-4 py-4 pt-8 sm:px-16">
        <LinkLogo apexDomain={apexDomain} />
        <h3 className="text-lg font-medium">Download QR Code</h3>
      </div>

      <div className="flex flex-col space-y-6 bg-gray-50 py-6 text-left">
        <div className="mx-auto overflow-hidden rounded-lg border-2 border-gray-200 bg-white p-4">
          <QRCodeSVG
            value={qrData.value}
            size={qrData.size / 8}
            bgColor={qrData.bgColor}
            fgColor={qrData.fgColor}
            level={qrData.level}
            {...(qrData.imageSettings && {
              imageSettings: {
                ...qrData.imageSettings,
                height: qrData.imageSettings
                  ? qrData.imageSettings.height / 8
                  : 0,
                width: qrData.imageSettings
                  ? qrData.imageSettings.width / 8
                  : 0,
              },
            })}
          />
        </div>

        <AdvancedSettings
          qrData={qrData}
          setFgColor={setFgColor}
          showLogo={showLogo}
          setShowLogo={setShowLogo}
          setShowLinkQRModal={setShowLinkQRModal}
        />

        <div className="grid grid-cols-2 gap-2 px-4 sm:px-16">
          <QrDropdown
            button={
              <>
                <Clipboard />
                <p>Copy</p>
              </>
            }
          >
            <>
              <button
                onClick={async () => {
                  toast.promise(copyToClipboard, {
                    loading: "Copying QR code to clipboard...",
                    success: "Copied QR code to clipboard!",
                    error: "Failed to copy",
                  });
                }}
                className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
              >
                <IconMenu
                  text="Image"
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
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://api.dub.co/qr?url=${linkConstructor({
                      key: props.key,
                      domain: props.domain,
                      searchParams: {
                        qr: "1",
                      },
                    })}`,
                  );
                  toast.success("Copied QR code URL to clipboard!");
                  setCopiedURL(true);
                  setTimeout(() => setCopiedURL(false), 2000);
                }}
                className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
              >
                <IconMenu
                  text="URL"
                  icon={
                    copiedURL ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )
                  }
                />
              </button>
            </>
          </QrDropdown>
          <QrDropdown
            button={
              <>
                <Download />
                <p>Export</p>
              </>
            }
          >
            <>
              <button
                onClick={async () => {
                  download(
                    await getQRAsSVGDataUri({
                      ...qrData,
                      ...(qrData.imageSettings && {
                        imageSettings: {
                          ...qrData.imageSettings,
                          src:
                            logo && plan !== "free"
                              ? logo
                              : "https://assets.dub.co/logo.png",
                        },
                      }),
                    }),
                    "svg",
                  );
                }}
                className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
              >
                <IconMenu text="SVG" icon={<Photo className="h-4 w-4" />} />
              </button>
              <button
                onClick={async () => {
                  download(
                    (await getQRAsCanvas(qrData, "image/png")) as string,
                    "png",
                  );
                }}
                className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
              >
                <IconMenu text="PNG" icon={<Photo className="h-4 w-4" />} />
              </button>
              <button
                onClick={async () => {
                  download(
                    (await getQRAsCanvas(qrData, "image/jpeg")) as string,
                    "jpg",
                  );
                }}
                className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
              >
                <IconMenu text="JPEG" icon={<Photo className="h-4 w-4" />} />
              </button>
            </>
          </QrDropdown>
        </div>

        {/* This will be used to prompt downloads. */}
        <a
          className="hidden"
          download={`${props.key}-qrcode.svg`}
          ref={anchorRef}
        />
      </div>
    </>
  );
}

function AdvancedSettings({
  qrData,
  setFgColor,
  showLogo,
  setShowLogo,
  setShowLinkQRModal,
}) {
  const { slug } = useParams() as { slug?: string };
  const { plan, logo } = useWorkspace();
  const [expanded, setExpanded] = useState(false);

  const debouncedSetFgColor = useDebouncedCallback((color) => {
    setFgColor(color);
  }, 100);

  const { queryParams } = useRouterStuff();

  return (
    <div>
      <div className="px-4 sm:px-16">
        <button
          type="button"
          className="flex items-center"
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronRight
            className={`h-5 w-5 text-gray-600 ${
              expanded ? "rotate-90" : ""
            } transition-all`}
          />
          <p className="text-sm text-gray-600">Advanced options</p>
        </button>
      </div>
      {expanded && (
        <motion.div
          key="advanced-options"
          {...FADE_IN_ANIMATION_SETTINGS}
          className="mt-4 grid gap-5 border-b border-t border-gray-200 bg-white px-4 py-8 sm:px-16"
        >
          <div>
            <label
              htmlFor="logo-toggle"
              className="flex items-center space-x-1"
            >
              <p className="text-sm font-medium text-gray-700">Logo</p>
              {plan !== "free" && (
                <InfoTooltip
                  content={
                    <SimpleTooltipContent
                      title=""
                      cta="How to update my QR Code logo?"
                      href="https://dub.co/help/article/custom-qr-codes"
                    />
                  }
                />
              )}
            </label>
            {plan !== "free" ? (
              <div className="mt-1 flex items-center space-x-2">
                <Switch
                  fn={setShowLogo}
                  checked={showLogo}
                  trackDimensions="h-6 w-12"
                  thumbDimensions="w-5 h-5"
                  thumbTranslate="translate-x-6"
                />
                <p className="text-sm text-gray-600">
                  Show {!slug || (!logo && process.env.NEXT_PUBLIC_APP_NAME)}{" "}
                  Logo
                </p>
              </div>
            ) : (
              <Tooltip
                content={
                  <TooltipContent
                    title="You need to be on the Pro plan and above to customize your QR Code logo."
                    cta="Upgrade to Pro"
                    {...(APP_HOSTNAMES.has(window.location.hostname)
                      ? {
                          onClick: () => {
                            setShowLinkQRModal(false);
                            queryParams({
                              set: {
                                upgrade: "pro",
                              },
                            });
                          },
                        }
                      : { href: "https://dub.co/pricing" })}
                  />
                }
              >
                <div className="pointer-events-none mt-1 flex cursor-not-allowed items-center space-x-2 sm:pointer-events-auto">
                  <Switch
                    fn={setShowLogo}
                    checked={showLogo}
                    trackDimensions="h-6 w-12"
                    thumbDimensions="w-5 h-5"
                    thumbTranslate="translate-x-6"
                    disabled={true}
                  />
                  <p className="text-sm text-gray-600">
                    Show {process.env.NEXT_PUBLIC_APP_NAME} Logo
                  </p>
                </div>
              </Tooltip>
            )}
          </div>
          <div>
            <label
              htmlFor="color"
              className="block text-sm font-medium text-gray-700"
            >
              Foreground Color
            </label>
            <div className="relative mt-1 flex h-9 w-48 rounded-md shadow-sm">
              <Tooltip
                content={
                  <div className="flex max-w-xs flex-col items-center space-y-3 p-5 text-center">
                    <HexColorPicker
                      color={qrData.fgColor}
                      onChange={debouncedSetFgColor}
                    />
                  </div>
                }
              >
                <div
                  className="h-full w-12 rounded-l-md border"
                  style={{
                    backgroundColor: qrData.fgColor,
                    borderColor: qrData.fgColor,
                  }}
                />
              </Tooltip>
              <HexColorInput
                id="color"
                name="color"
                color={qrData.fgColor}
                onChange={(color) => setFgColor(color)}
                prefixed
                style={{ borderColor: qrData.fgColor }}
                className="block w-full rounded-r-md border-2 border-l-0 pl-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-black sm:text-sm"
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function QrDropdown({
  button,
  children,
}: {
  button: JSX.Element;
  children: JSX.Element;
}) {
  const [openPopover, setOpenPopover] = useState(false);
  return (
    <Popover
      content={<div className="grid w-full gap-1 p-2 sm:w-40">{children}</div>}
      align="center"
      openPopover={openPopover}
      setOpenPopover={setOpenPopover}
    >
      <button
        onClick={() => setOpenPopover(!openPopover)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-black bg-black px-5 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        {button}
      </button>
    </Popover>
  );
}

export function useLinkQRModal({ props }: { props: QRLinkProps }) {
  const [showLinkQRModal, setShowLinkQRModal] = useState(false);

  const LinkQRModal = useCallback(() => {
    return (
      <LinkQRModalHelper
        showLinkQRModal={showLinkQRModal}
        setShowLinkQRModal={setShowLinkQRModal}
        props={props}
      />
    );
  }, [showLinkQRModal, setShowLinkQRModal, props]);

  return useMemo(
    () => ({ showLinkQRModal, setShowLinkQRModal, LinkQRModal }),
    [showLinkQRModal, setShowLinkQRModal, LinkQRModal],
  );
}
