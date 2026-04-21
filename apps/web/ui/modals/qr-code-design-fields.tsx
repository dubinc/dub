import { getQRAsCanvas, getQRAsSVGDataUri, getQRData } from "@/lib/qr";
import { QRCodeDesign } from "@/lib/qr/types";
import { QRLinkProps } from "@/lib/types";
import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  ButtonTooltip,
  IconMenu,
  InfoTooltip,
  Popover,
  ShimmerDots,
  Tooltip,
  useCopyToClipboard,
  useMediaQuery,
} from "@dub/ui";
import { Check, Check2, Copy, Download, Hyperlink, Photo } from "@dub/ui/icons";
import { API_DOMAIN, cn, linkConstructor } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { HexColorInput, HexColorPicker } from "react-colorful";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_COLORS = [
  "#000000",
  "#C73E33",
  "#DF6547",
  "#F4B3D7",
  "#F6CF54",
  "#49A065",
  "#2146B7",
  "#AE49BF",
];

export const DEFAULT_QR_DESIGN: QRCodeDesign = {
  fgColor: "#000000",
  hideLogo: false,
  dotStyle: "square",
  markerCenterStyle: "square",
  markerBorderStyle: "square",
};

// ─── Shared form body ─────────────────────────────────────────────────────────

/**
 * The inner content of the QR code design form — preview, style toggles, color
 * pickers, and action buttons. Both link and partner modals render this,
 * differing only in their header and the optional `logoSection` slot.
 */
export function QRCodeDesignFields({
  data,
  setData,
  url,
  logo,
  linkProps,
  qrData,
  onClose,
  logoSection,
}: {
  data: QRCodeDesign;
  setData: Dispatch<SetStateAction<QRCodeDesign>>;
  url?: string;
  logo?: string;
  linkProps: QRLinkProps;
  qrData: ReturnType<typeof getQRData> | null;
  onClose: () => void;
  /** Optional slot rendered left of Dot style (link modal uses this for Logo toggle). */
  logoSection?: React.ReactNode;
}) {
  const id = useId();
  const { isMobile } = useMediaQuery();

  const onColorChange = useDebouncedCallback(
    (color: string) => setData((d) => ({ ...d, fgColor: color })),
    500,
  );

  const onMarkerColorChange = useDebouncedCallback(
    (color: string) => setData((d) => ({ ...d, markerColor: color })),
    500,
  );

  const previewKey = `${data.fgColor}-${data.hideLogo}-${data.dotStyle}-${data.markerCenterStyle}-${data.markerBorderStyle}-${data.markerColor ?? ""}`;

  return (
    <>
      {/* Preview */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-700">
              QR Code Preview
            </span>
            <InfoTooltip content="Customize your QR code to fit your brand. [Learn more.](https://dub.co/help/article/custom-qr-codes)" />
          </div>
          {url && qrData && (
            <div className="flex items-center gap-2">
              <DownloadPopover qrData={qrData} linkProps={linkProps}>
                <div>
                  <ButtonTooltip tooltipProps={{ content: "Download QR code" }}>
                    <Download className="h-4 w-4 text-neutral-500" />
                  </ButtonTooltip>
                </div>
              </DownloadPopover>
              <CopyPopover qrData={qrData} linkProps={linkProps}>
                <div>
                  <ButtonTooltip tooltipProps={{ content: "Copy QR code" }}>
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
                key={previewKey}
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
                  dotStyle={data.dotStyle}
                  markerCenterStyle={data.markerCenterStyle}
                  markerBorderStyle={data.markerBorderStyle}
                  markerColor={data.markerColor}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Logo slot + Dot style */}
      <div className={cn(logoSection && "grid grid-cols-2 gap-4")}>
        {logoSection}
        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Dot style
            </label>
          </div>
          <SegmentedControl
            activeIndex={
              data.dotStyle === "rounded"
                ? 1
                : data.dotStyle === "extra-rounded"
                  ? 2
                  : 0
            }
            count={3}
          >
            <SegmentTab
              active={!data.dotStyle || data.dotStyle === "square"}
              onClick={() => setData((d) => ({ ...d, dotStyle: "square" }))}
              ariaLabel="Square dots"
            >
              <SquareDotIcon />
            </SegmentTab>
            <SegmentTab
              active={data.dotStyle === "rounded"}
              onClick={() => setData((d) => ({ ...d, dotStyle: "rounded" }))}
              ariaLabel="Rounded dots"
            >
              <RoundedDotIcon />
            </SegmentTab>
            <SegmentTab
              active={data.dotStyle === "extra-rounded"}
              onClick={() =>
                setData((d) => ({ ...d, dotStyle: "extra-rounded" }))
              }
              ariaLabel="Extra-rounded dots"
            >
              <ExtraRoundedDotIcon />
            </SegmentTab>
          </SegmentedControl>
        </div>
      </div>

      {/* Marker center + Marker border */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Marker center
            </label>
          </div>
          <SegmentedControl
            activeIndex={data.markerCenterStyle === "circle" ? 1 : 0}
            count={2}
          >
            <SegmentTab
              active={
                !data.markerCenterStyle || data.markerCenterStyle === "square"
              }
              onClick={() =>
                setData((d) => ({ ...d, markerCenterStyle: "square" }))
              }
              ariaLabel="Square marker center"
            >
              <MarkerCenterSquareIcon />
            </SegmentTab>
            <SegmentTab
              active={data.markerCenterStyle === "circle"}
              onClick={() =>
                setData((d) => ({ ...d, markerCenterStyle: "circle" }))
              }
              ariaLabel="Circle marker center"
            >
              <MarkerCenterCircleIcon />
            </SegmentTab>
          </SegmentedControl>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Marker border
            </label>
          </div>
          <SegmentedControl
            activeIndex={
              data.markerBorderStyle === "rounded-square"
                ? 1
                : data.markerBorderStyle === "circle"
                  ? 2
                  : 0
            }
            count={3}
          >
            <SegmentTab
              active={
                !data.markerBorderStyle || data.markerBorderStyle === "square"
              }
              onClick={() =>
                setData((d) => ({ ...d, markerBorderStyle: "square" }))
              }
              ariaLabel="Square marker border"
            >
              <MarkerBorderSquareIcon />
            </SegmentTab>
            <SegmentTab
              active={data.markerBorderStyle === "rounded-square"}
              onClick={() =>
                setData((d) => ({
                  ...d,
                  markerBorderStyle: "rounded-square",
                }))
              }
              ariaLabel="Rounded marker border"
            >
              <MarkerBorderRoundedIcon />
            </SegmentTab>
            <SegmentTab
              active={data.markerBorderStyle === "circle"}
              onClick={() =>
                setData((d) => ({ ...d, markerBorderStyle: "circle" }))
              }
              ariaLabel="Circle marker border"
            >
              <MarkerBorderCircleIcon />
            </SegmentTab>
          </SegmentedControl>
        </div>
      </div>

      <ColorSection
        id={`${id}-fg`}
        label="Dot Color"
        color={data.fgColor}
        onChange={onColorChange}
        onSwatchClick={(color) => setData((d) => ({ ...d, fgColor: color }))}
      />

      <ColorSection
        id={`${id}-marker`}
        label="Marker Color"
        tooltip="Set a different color for the finder pattern markers. Defaults to the QR code color."
        color={data.markerColor ?? data.fgColor}
        onChange={onMarkerColorChange}
        onSwatchClick={(color) =>
          setData((d) => ({ ...d, markerColor: color }))
        }
        extraAction={
          data.markerColor && data.markerColor !== data.fgColor ? (
            <button
              type="button"
              onClick={() => setData((d) => ({ ...d, markerColor: undefined }))}
              className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-600 hover:underline"
            >
              Match dot color
            </button>
          ) : undefined
        }
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          text="Cancel"
          className="h-9 w-fit"
          onClick={onClose}
        />
        <Button
          type="submit"
          variant="primary"
          text="Save changes"
          className="h-9 w-fit"
        />
      </div>
    </>
  );
}

// ─── Segmented control ────────────────────────────────────────────────────────

export function SegmentedControl({
  activeIndex,
  count,
  disabled,
  children,
}: {
  activeIndex: number;
  count: number;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mt-1 flex h-11 rounded-xl border border-neutral-200 bg-neutral-50 p-1",
        disabled && "opacity-50",
      )}
    >
      <div
        className="pointer-events-none absolute inset-y-1 left-1 rounded-lg bg-white"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
          transition: "transform 200ms cubic-bezier(0.23, 1, 0.32, 1)",
          boxShadow:
            "0px 2px 6px 0px rgba(0,0,0,0.10), 0px 0px 2px 0px rgba(0,0,0,0.05)",
        }}
      />
      {children}
    </div>
  );
}

export function SegmentTab({
  active,
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "relative flex flex-1 items-center justify-center rounded-lg text-neutral-700",
        disabled && "cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

// ─── Color section ────────────────────────────────────────────────────────────

export function ColorSection({
  id,
  label,
  tooltip,
  color,
  onChange,
  onSwatchClick,
  extraAction,
}: {
  id: string;
  label: string;
  tooltip?: string;
  color: string;
  onChange: (color: string) => void;
  onSwatchClick: (color: string) => void;
  extraAction?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="block text-sm font-medium text-neutral-700">
            {label}
          </span>
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
        {extraAction}
      </div>
      <div className="mt-2 flex gap-6">
        <div className="relative flex h-9 w-32 shrink-0 rounded-md shadow-sm">
          <Tooltip
            content={
              <div className="flex max-w-xs flex-col items-center space-y-3 p-5 text-center">
                <HexColorPicker color={color} onChange={onChange} />
              </div>
            }
          >
            <div
              className="h-full w-12 rounded-l-md border"
              style={{ backgroundColor: color, borderColor: color }}
            />
          </Tooltip>
          <HexColorInput
            id={id}
            name={id}
            color={color}
            onChange={onChange}
            prefixed
            style={{ borderColor: color }}
            className="block w-full rounded-r-md border-2 border-l-0 pl-3 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-black sm:text-sm"
          />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {DEFAULT_COLORS.map((swatch) => {
            const isSelected = color === swatch;
            return (
              <button
                key={swatch}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSwatchClick(swatch)}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full transition-all",
                  isSelected
                    ? "ring-1 ring-black ring-offset-[3px]"
                    : "ring-black/10 hover:ring-4",
                )}
                style={{ backgroundColor: swatch }}
              >
                {isSelected && <Check2 className="size-4 text-white" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Style icons ──────────────────────────────────────────────────────────────

export function SquareDotIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect width="5" height="5" />
      <rect x="10" width="5" height="5" />
      <rect x="5" y="10" width="5" height="5" />
      <rect x="15" width="5" height="5" />
      <rect x="15" y="10" width="5" height="5" />
      <rect y="5" width="5" height="5" />
      <rect y="15" width="5" height="5" />
      <rect x="10" y="5" width="5" height="5" />
      <rect x="15" y="15" width="5" height="5" />
      <rect x="10" y="15" width="5" height="5" />
    </svg>
  );
}

export function RoundedDotIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M0 2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5C5 3.88071 3.88071 5 2.5 5C1.11929 5 0 3.88071 0 2.5Z" />
      <path d="M10 2.5C10 1.11929 11.1193 0 12.5 0C13.8807 0 15 1.11929 15 2.5C15 3.88071 13.8807 5 12.5 5C11.1193 5 10 3.88071 10 2.5Z" />
      <path d="M5 12.5C5 11.1193 6.11929 10 7.5 10C8.88071 10 10 11.1193 10 12.5C10 13.8807 8.88071 15 7.5 15C6.11929 15 5 13.8807 5 12.5Z" />
      <path d="M15 2.5C15 1.11929 16.1193 0 17.5 0C18.8807 0 20 1.11929 20 2.5C20 3.88071 18.8807 5 17.5 5C16.1193 5 15 3.88071 15 2.5Z" />
      <path d="M15 12.5C15 11.1193 16.1193 10 17.5 10C18.8807 10 20 11.1193 20 12.5C20 13.8807 18.8807 15 17.5 15C16.1193 15 15 13.8807 15 12.5Z" />
      <path d="M0 7.5C0 6.11929 1.11929 5 2.5 5C3.88071 5 5 6.11929 5 7.5C5 8.88071 3.88071 10 2.5 10C1.11929 10 0 8.88071 0 7.5Z" />
      <path d="M0 17.5C0 16.1193 1.11929 15 2.5 15C3.88071 15 5 16.1193 5 17.5C5 18.8807 3.88071 20 2.5 20C1.11929 20 0 18.8807 0 17.5Z" />
      <path d="M10 7.5C10 6.11929 11.1193 5 12.5 5C13.8807 5 15 6.11929 15 7.5C15 8.88071 13.8807 10 12.5 10C11.1193 10 10 8.88071 10 7.5Z" />
      <path d="M15 17.5C15 16.1193 16.1193 15 17.5 15C18.8807 15 20 16.1193 20 17.5C20 18.8807 18.8807 20 17.5 20C16.1193 20 15 18.8807 15 17.5Z" />
      <path d="M10 17.5C10 16.1193 11.1193 15 12.5 15C13.8807 15 15 16.1193 15 17.5C15 18.8807 13.8807 20 12.5 20C11.1193 20 10 18.8807 10 17.5Z" />
    </svg>
  );
}

export function ExtraRoundedDotIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M5 12.5C5 11.1193 6.11929 10 7.5 10C8.88071 10 10 11.1193 10 12.5C10 13.8807 8.88071 15 7.5 15C6.11929 15 5 13.8807 5 12.5Z" />
      <path d="M5 7.5C5 8.88071 3.88071 10 2.5 10C1.11929 10 0 8.88071 0 7.5V2.5C0 1.11929 1.11929 0 2.5 0C3.88071 0 5 1.11929 5 2.5V7.5Z" />
      <path d="M0 17.5C0 16.1193 1.11929 15 2.5 15C3.88071 15 5 16.1193 5 17.5C5 18.8807 3.88071 20 2.5 20C1.11929 20 0 18.8807 0 17.5Z" />
      <path d="M15 7.5C15 8.88071 13.8807 10 12.5 10C11.1193 10 10 8.88071 10 7.5V5C10 2.23858 12.2386 0 15 0H17.5C18.8807 0 20 1.11929 20 2.5C20 3.88071 18.8807 5 17.5 5H15V7.5Z" />
      <path d="M20 15C20 17.7614 17.7614 20 15 20H12.5C11.1193 20 10 18.8807 10 17.5C10 16.1193 11.1193 15 12.5 15H15V12.5C15 11.1193 16.1193 10 17.5 10C18.8807 10 20 11.1193 20 12.5V15Z" />
    </svg>
  );
}

export function MarkerCenterSquareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.25"
        y="1.25"
        width="17.5"
        height="17.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2.5"
      />
      <rect x="5" y="5" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

export function MarkerCenterCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.25"
        y="1.25"
        width="17.5"
        height="17.5"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="2.5"
      />
      <path
        d="M5 10C5 7.23858 7.23858 5 10 5C12.7614 5 15 7.23858 15 10C15 12.7614 12.7614 15 10 15C7.23858 15 5 12.7614 5 10Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function MarkerBorderSquareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.25"
        y="1.25"
        width="17.5"
        height="17.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function MarkerBorderRoundedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 1.25H15C17.0711 1.25 18.75 2.92893 18.75 5V15C18.75 17.0711 17.0711 18.75 15 18.75H5C2.92893 18.75 1.25 17.0711 1.25 15V5C1.25 2.92893 2.92893 1.25 5 1.25Z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function MarkerBorderCircleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 1.25C14.8325 1.25 18.75 5.16751 18.75 10C18.75 14.8325 14.8325 18.75 10 18.75C5.16751 18.75 1.25 14.8325 1.25 10C1.25 5.16751 5.16751 1.25 10 1.25Z"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

// ─── Download / Copy popovers ─────────────────────────────────────────────────

export function DownloadPopover({
  qrData,
  linkProps,
  children,
}: PropsWithChildren<{
  qrData: ReturnType<typeof getQRData>;
  linkProps: QRLinkProps;
}>) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [openPopover, setOpenPopover] = useState(false);

  function download(url: string, extension: string) {
    if (!anchorRef.current) return;
    anchorRef.current.href = url;
    anchorRef.current.download = `${linkProps.key}-qrcode.${extension}`;
    anchorRef.current.click();
    setOpenPopover(false);
  }

  return (
    <div>
      <Popover
        content={
          <div className="grid p-1 sm:min-w-48">
            <button
              type="button"
              onClick={async () =>
                download(await getQRAsSVGDataUri(qrData), "svg")
              }
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download SVG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
            <button
              type="button"
              onClick={async () =>
                download(
                  (await getQRAsCanvas(qrData, "image/png")) as string,
                  "png",
                )
              }
              className="rounded-md p-2 text-left text-sm font-medium text-neutral-500 transition-all duration-75 hover:bg-neutral-100"
            >
              <IconMenu
                text="Download PNG"
                icon={<Photo className="h-4 w-4" />}
              />
            </button>
            <button
              type="button"
              onClick={async () =>
                download(
                  (await getQRAsCanvas(qrData, "image/jpeg")) as string,
                  "jpg",
                )
              }
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
      <a
        className="hidden"
        download={`${linkProps.key}-qrcode.svg`}
        ref={anchorRef}
      />
    </div>
  );
}

export function CopyPopover({
  qrData,
  linkProps,
  children,
}: PropsWithChildren<{
  qrData: ReturnType<typeof getQRData>;
  linkProps: QRLinkProps;
}>) {
  const [openPopover, setOpenPopover] = useState(false);
  const [copiedURL, copyUrlToClipboard] = useCopyToClipboard(2000);
  const [copiedImage, copyImageToClipboard] = useCopyToClipboard(2000);

  const copyToClipboard = async () => {
    const canvas = await getQRAsCanvas(qrData, "image/png", true);
    (canvas as HTMLCanvasElement).toBlob(async (blob) => {
      // @ts-ignore
      const item = new ClipboardItem({ "image/png": blob });
      await copyImageToClipboard(item);
      setOpenPopover(false);
    });
  };

  return (
    <Popover
      content={
        <div className="grid p-1 sm:min-w-48">
          <button
            type="button"
            onClick={() =>
              toast.promise(copyToClipboard, {
                loading: "Copying QR code to clipboard...",
                success: "Copied QR code to clipboard!",
                error: "Failed to copy",
              })
            }
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
                key: linkProps.key,
                domain: linkProps.domain,
                searchParams: { qr: "1" },
              })}${qrData.hideLogo ? "&hideLogo=true" : ""}`;
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

// Re-export for convenience
export { useMemo };
export type { QRCodeDesign };
