import {
  ArrowDownToLine,
  Check,
  ChevronRight,
  Clipboard,
  Image,
  Link2,
} from "lucide-react";
import { Dispatch, SetStateAction, useMemo, useRef, useState } from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { QRCodeSVG, getQRAsCanvas, getQRAsSVGDataUri } from "../../../lib/qr";
import IconMenu from "../../../public/IconMenu";
import Switch from "../../../ui/components/switch";

interface QRLinkProps {
  url: string;
  key: string;
}

interface QRCodeDownloadProps {
  props: QRLinkProps;
}

export function QRCodeDownload({ props }: QRCodeDownloadProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);

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
      value: props.url,
      bgColor: "#ffffff",
      fgColor,
      size: 1024,
      level: "Q",
      ...(showLogo && {
        imageSettings: {
          src: "https://dub.co/_static/logo.svg",
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
    <div className="rounded-lg bg-gray-50 px-14 py-2 shadow-md">
      <div className="flex flex-col items-center justify-center space-y-3 border-b  border-gray-200 px-4 py-4 pt-2 sm:px-16">
        <h3 className="text-lg font-medium">Download QR Code</h3>
      </div>

      <div className="flex flex-col space-y-4 bg-gray-50 py-6  text-left">
        <div className="mx-auto rounded-lg border-2 border-gray-200  bg-white p-4">
          <QRCodeSVG
            value={qrData.value}
            size={qrData.size / 9}
            bgColor={qrData.bgColor}
            fgColor={qrData.fgColor}
            level={qrData.level}
            includeMargin={false}
            {...(qrData.imageSettings && {
              imageSettings: {
                ...qrData.imageSettings,
                height: qrData.imageSettings.height / 8,
                width: qrData.imageSettings.width / 8,
              },
            })}
          />
        </div>

        <AdvancedSettings
          qrData={qrData}
          setFgColor={setFgColor}
          showLogo={showLogo}
          setShowLogo={setShowLogo}
        />

        <div className="grid grid-cols-2 gap-4 pt-3">
          <QrDropdown
            button={
              <IconMenu text="Copy" icon={<Clipboard className="h-3 w-3" />} />
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
                      <Image className="h-4 w-4" />
                    )
                  }
                />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(props.url);
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
              <IconMenu
                text="Export"
                icon={<ArrowDownToLine className="h-3 w-3" />}
              />
            }
          >
            <>
              <button
                className="w-full rounded-md p-2 text-left text-sm font-medium text-gray-500 transition-all duration-75 hover:bg-gray-100"
                onClick={() => {
                  download(
                    getQRAsSVGDataUri({
                      ...qrData,
                      ...(qrData.imageSettings && {
                        imageSettings: {
                          ...qrData.imageSettings,
                          src: "https://dub.co/_static/logo.svg",
                        },
                      }),
                    }),
                    "svg",
                  );
                }}
              >
                <IconMenu text="SVG" icon={<Image className="h-4 w-4" />} />
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
                <IconMenu text="PNG" icon={<Image className="h-4 w-4" />} />
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
                <IconMenu text="JPEG" icon={<Image className="h-4 w-4" />} />
              </button>
            </>
          </QrDropdown>
        </div>

        <a
          className="hidden"
          download={`${props.key}-qrcode.svg`}
          ref={anchorRef}
        />
      </div>
    </div>
  );
}

interface AdvancedSettingsProps {
  qrData: any;
  setFgColor: Dispatch<SetStateAction<string>>;
  showLogo: boolean;
  setShowLogo: Dispatch<SetStateAction<boolean>>;
}

function AdvancedSettings({
  qrData,
  setFgColor,
  showLogo,
  setShowLogo,
}: AdvancedSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const debouncedSetFgColor = useDebouncedCallback((color) => {
    setFgColor(color);
  }, 100);

  return (
    <>
      <div className="flex justify-center">
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
        <div className=" grid gap-5 border-b border-t border-gray-200  p-5 ">
          <div>
            <label
              htmlFor="logo-toggle"
              className="flex items-center space-x-1"
            >
              <p className="text-sm font-medium text-gray-700">Logo</p>
            </label>
            <div className="mt-1 flex items-center space-x-2">
              <Switch
                onChange={(e) => setShowLogo(e.target.checked)}
                checked={showLogo}
              />
              <p className="text-sm text-gray-600">Show Logo</p>
            </div>
          </div>
          <div className="relative">
            <label
              htmlFor="color"
              className="block text-sm font-medium text-gray-700"
            >
              Foreground Color
            </label>
            <div
              className="relative mt-1 flex items-center"
              onMouseEnter={() => setShowColorPicker(true)}
              onMouseLeave={() => setShowColorPicker(false)}
            >
              {showColorPicker && (
                <div className="absolute -left-3/4 bottom-3/4 rounded-lg bg-white p-2">
                  <HexColorPicker
                    color={qrData.fgColor}
                    onChange={debouncedSetFgColor}
                  />
                </div>
              )}
              <div
                className="h-9 w-12 cursor-pointer rounded-md border border-gray-300"
                style={{
                  backgroundColor: qrData.fgColor,
                  borderColor: qrData.fgColor,
                }}
              />
              <HexColorInput
                id="color"
                name="color"
                color={qrData.fgColor}
                onChange={setFgColor}
                prefixed
                style={{ borderColor: qrData.fgColor }}
                className="block h-8 w-full rounded-r-md border-2 border-l-0 pl-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-black sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface QrDropdownProps {
  button: JSX.Element;
  children: JSX.Element;
}

function QrDropdown({ button, children }: QrDropdownProps) {
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <div
      className="relative flex w-full justify-center"
      onMouseEnter={() => setOpenPopover(true)}
      onMouseLeave={() => setOpenPopover(false)}
    >
      <button
        type="button"
        className="inline-flex w-full items-center justify-center rounded-md border-2 border-black bg-black py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        {button}
      </button>
      {openPopover && (
        <div className="absolute z-10 mt-9 w-full rounded-md bg-white shadow-lg">
          <div className="grid gap-1 p-2">{children}</div>
        </div>
      )}
    </div>
  );
}
