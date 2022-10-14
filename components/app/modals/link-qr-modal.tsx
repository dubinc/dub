import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import BlurImage from "@/components/shared/blur-image";
import { ChevronRight, Download, Logo } from "@/components/shared/icons";
import Modal from "@/components/shared/modal";
import Switch from "@/components/shared/switch";
import Tooltip, { TooltipContent } from "@/components/shared/tooltip";
import { QRCodeSVG, getQRAsCanvas, getQRAsSVGDataUri } from "@/lib/qr";
import useProject from "@/lib/swr/use-project";
import useUsage from "@/lib/swr/use-usage";
import { SimpleLinkProps } from "@/lib/types";
import { linkConstructor } from "@/lib/utils";

function LinkQRModalHelper({
  showLinkQRModal,
  setShowLinkQRModal,
  props,
}: {
  showLinkQRModal: boolean;
  setShowLinkQRModal: Dispatch<SetStateAction<boolean>>;
  props: SimpleLinkProps;
}) {
  const anchorRef = useRef<HTMLAnchorElement>();
  const { project: { domain, logo } = {} } = useProject();
  const { avatarUrl, urlHostname } = useMemo(() => {
    try {
      const urlHostname = new URL(props.url).hostname;
      return {
        avatarUrl: `https://www.google.com/s2/favicons?sz=64&domain_url=${urlHostname}`,
        urlHostname,
      };
    } catch (e) {
      return null;
    }
  }, [props]);

  const qrDestUrl = useMemo(
    () => linkConstructor({ key: props.key, domain }),
    [props, domain],
  );

  const qrLogoUrl = useMemo(() => {
    if (logo) return logo;
    return typeof window !== "undefined" && window.location.origin
      ? new URL("/static/logo.svg", window.location.origin).href
      : "";
  }, []);

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${props.key}-qrcode.${extension}`;
    anchorRef.current.click();
  }

  const [showLogo, setShowLogo] = useState(true);
  const [qrData, setQrData] = useState({
    value: qrDestUrl,
    bgColor: "#ffffff",
    fgColor: "#000000",
    size: 1024,
    level: "Q", // QR Code error correction level: https://blog.qrstuff.com/general/qr-code-error-correction
    ...(showLogo && {
      imageSettings: {
        src: qrLogoUrl,
        height: 256,
        width: 256,
        excavate: true,
      },
    }),
  });

  return (
    <Modal showModal={showLinkQRModal} setShowModal={setShowLinkQRModal}>
      <div className="inline-block w-full sm:max-w-md align-middle transition-all transform bg-white sm:border sm:border-gray-200 shadow-xl sm:rounded-2xl">
        <div className="flex flex-col justify-center items-center space-y-3 sm:px-16 px-4 pt-8 py-4 border-b border-gray-200">
          {avatarUrl ? (
            <BlurImage
              src={avatarUrl}
              alt={urlHostname}
              className="w-10 h-10 rounded-full border border-gray-200"
              width={40}
              height={40}
            />
          ) : (
            <Logo className="w-10 h-10" />
          )}
          <h3 className="font-medium text-lg">Download QR Code</h3>
        </div>

        <div className="flex flex-col space-y-6 text-left bg-gray-50 py-6 sm:rounded-b-2xl">
          <div className="p-4 rounded-lg bg-white mx-auto border-2 border-gray-200">
            <QRCodeSVG
              value={qrData.value}
              size={qrData.size / 8}
              bgColor={qrData.bgColor}
              fgColor={qrData.fgColor}
              level={qrData.level}
              includeMargin={false}
              imageSettings={
                showLogo && {
                  ...qrData.imageSettings,
                  height: qrData.imageSettings.height / 8,
                  width: qrData.imageSettings.width / 8,
                }
              }
            />
          </div>

          <AdvancedSettings
            qrData={qrData}
            setQrData={setQrData}
            setShowLogo={setShowLogo}
          />

          <div className="flex gap-2 sm:px-16 px-4">
            <button
              onClick={async () =>
                download(
                  await getQRAsSVGDataUri({
                    ...qrData,
                    ...(showLogo && {
                      imageSettings: {
                        ...qrData.imageSettings,
                        src: logo || "https://dub.sh/static/logo.svg",
                      },
                    }),
                  }),
                  "svg",
                )
              }
              className="py-1.5 px-5 bg-black hover:bg-white rounded-md border border-black text-sm text-white hover:text-black transition-all w-full flex items-center gap-2 justify-center"
            >
              <Download /> SVG
            </button>
            <button
              onClick={async () =>
                download(await getQRAsCanvas(qrData, "image/png"), "png")
              }
              className="py-1.5 px-5 bg-black hover:bg-white rounded-md border border-black text-sm text-white hover:text-black transition-all w-full flex items-center gap-2 justify-center"
            >
              <Download /> PNG
            </button>
            <button
              onClick={async () =>
                download(await getQRAsCanvas(qrData, "image/jpeg"), "jpg")
              }
              className="py-1.5 px-5 bg-black hover:bg-white rounded-md border border-black text-sm text-white hover:text-black transition-all w-full flex items-center gap-2 justify-center"
            >
              <Download /> JPEG
            </button>
          </div>

          {/* This will be used to prompt downloads. */}
          <a
            className="hidden"
            download={`${props.key}-qrcode.svg`}
            ref={anchorRef}
          />
        </div>
      </div>
    </Modal>
  );
}

function AdvancedSettings({ qrData, setQrData, setShowLogo }) {
  const { plan } = useUsage();
  const [expanded, setExpanded] = useState(false);

  const isApp = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.location.host.startsWith("app.");
  }, []);

  return (
    <div>
      <div className="sm:px-16 px-4">
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
          <p className="text-gray-600 text-sm">Advanced options</p>
        </button>
      </div>
      {expanded && (
        <div className="mt-4 grid gap-5 bg-white border-t border-b border-gray-200 sm:px-16 px-4 py-8">
          <div>
            <label
              htmlFor="logo-toggle"
              className="block text-sm font-medium text-gray-700"
            >
              Logo
            </label>
            {!plan || plan === "Free" ? (
              <Tooltip
                content={
                  <TooltipContent
                    title="As a freemium product, we rely on word of mouth to spread the word about Dub. If you'd like to remove the Dub logo/upload your own, please consider upgrading to a Pro plan."
                    cta="Upgrade to Pro"
                    ctaLink={isApp ? "/settings" : "/#pricing"}
                  />
                }
              >
                <div className="flex mt-1 space-x-2 items-center cursor-not-allowed pointer-events-none sm:pointer-events-auto">
                  <Switch
                    trackDimensions="h-6 w-12"
                    thumbDimensions="w-5 h-5"
                    thumbTranslate="translate-x-6"
                    setState={setShowLogo}
                    disabled={true}
                  />
                  <p className="text-gray-600 text-sm">Show Dub.sh Logo</p>
                </div>
              </Tooltip>
            ) : (
              <div className="flex mt-1 space-x-2 items-center">
                <Switch
                  trackDimensions="h-6 w-12"
                  thumbDimensions="w-5 h-5"
                  thumbTranslate="translate-x-6"
                  setState={setShowLogo}
                />
                <p className="text-gray-600 text-sm">Show Dub.sh Logo</p>
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="color"
              className="block text-sm font-medium text-gray-700"
            >
              Foreground Color
            </label>
            <div className="relative flex mt-1 rounded-md shadow-sm h-9 w-48">
              <Tooltip
                content={
                  <div className="max-w-xs flex flex-col text-center items-center space-y-3 p-5">
                    <HexColorPicker
                      color={qrData.fgColor}
                      onChange={(color) =>
                        setQrData({
                          ...qrData,
                          fgColor: color,
                        })
                      }
                    />
                  </div>
                }
              >
                <div
                  className="rounded-l-md w-12 h-full border"
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
                onChange={(color) =>
                  setQrData({
                    ...qrData,
                    fgColor: color,
                  })
                }
                prefixed
                style={{ borderColor: qrData.fgColor }}
                className={`border-2 border-l-0 text-gray-900 placeholder-gray-300 focus:ring-black pl-3 block w-full rounded-r-md focus:outline-none sm:text-sm`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function useLinkQRModal({ props }: { props: SimpleLinkProps }) {
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
    () => ({ setShowLinkQRModal, LinkQRModal }),
    [setShowLinkQRModal, LinkQRModal],
  );
}
