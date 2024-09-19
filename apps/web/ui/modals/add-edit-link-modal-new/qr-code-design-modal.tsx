import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  InfoTooltip,
  Modal,
  ShimmerDots,
  SimpleTooltipContent,
  Switch,
  Tooltip,
  useMediaQuery,
} from "@dub/ui";
import { Check2 } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { QRCodeDesign } from "./qr-code-preview";

const DEFAULT_COLORS = [
  "#000000",
  "#BDC2C6",
  "#C73E33",
  "#DF6547",
  "#F4B3D7",
  "#F6CF54",
  "#49A065",
  "#AE49BF",
  "#68B6E9",
  "#2146B7",
];

type QRCodeDesignModalProps = {
  url?: string;
  logo: string;
  data: QRCodeDesign;
  setData: Dispatch<SetStateAction<QRCodeDesign>>;
};

function QRCodeDesignModal(
  props: {
    showQRCodeDesignModal: boolean;
    setShowQRCodeDesignModal: Dispatch<SetStateAction<boolean>>;
  } & QRCodeDesignModalProps,
) {
  return props.showQRCodeDesignModal ? (
    <QRCodeDesignModalInner {...props} />
  ) : null;
}

function QRCodeDesignModalInner({
  showQRCodeDesignModal,
  setShowQRCodeDesignModal,
  url,
  logo,
  data: dataParent,
  setData: setDataParent,
}: {
  showQRCodeDesignModal: boolean;
  setShowQRCodeDesignModal: Dispatch<SetStateAction<boolean>>;
} & QRCodeDesignModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();

  const [data, setData] = useState(dataParent);

  return (
    <Modal
      showModal={showQRCodeDesignModal}
      setShowModal={setShowQRCodeDesignModal}
      className="max-w-[500px]"
    >
      <form
        className="flex flex-col gap-6 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowQRCodeDesignModal(false);

          setDataParent(data);
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Link Design</h3>
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
          <div className="relative mt-2 flex h-44 items-center justify-center overflow-hidden rounded-md border border-gray-300">
            {!isMobile && (
              <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
            )}
            {url && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={data.fgColor + data.showLogo}
                  initial={{ filter: "blur(2px)", opacity: 0.4 }}
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  exit={{ filter: "blur(2px)", opacity: 0.4 }}
                  transition={{ duration: 0.1 }}
                  className="relative flex size-full items-center justify-center"
                >
                  <QRCode
                    url={url}
                    fgColor={data.fgColor}
                    showLogo={data.showLogo}
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
            id={`${id}-show-logo`}
            checked={data.showLogo}
            fn={(checked) => {
              setData((d) => ({ ...d, showLogo: checked }));
            }}
          />
        </div>

        {/* Color selector */}
        <div>
          <span className="block text-sm font-medium text-gray-700">
            QR Code Color
          </span>
          <div className="mt-3 flex flex-wrap justify-between gap-2">
            {DEFAULT_COLORS.map((color) => {
              const isSelected = data.fgColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setData((d) => ({ ...d, fgColor: color }))}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all",
                    isSelected
                      ? "ring-1 ring-black ring-offset-4"
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

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => {
              setShowQRCodeDesignModal(false);
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
    </Modal>
  );
}

export function useQRCodeDesignModal(props: QRCodeDesignModalProps) {
  const [showQRCodeDesignModal, setShowQRCodeDesignModal] = useState(false);

  const QRCodeDesignModalCallback = useCallback(() => {
    return (
      <QRCodeDesignModal
        showQRCodeDesignModal={showQRCodeDesignModal}
        setShowQRCodeDesignModal={setShowQRCodeDesignModal}
        {...props}
      />
    );
  }, [showQRCodeDesignModal, setShowQRCodeDesignModal]);

  return useMemo(
    () => ({
      setShowQRCodeDesignModal,
      QRCodeDesignModal: QRCodeDesignModalCallback,
    }),
    [setShowQRCodeDesignModal, QRCodeDesignModalCallback],
  );
}
