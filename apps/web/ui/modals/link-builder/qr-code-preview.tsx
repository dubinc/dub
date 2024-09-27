import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  ShimmerDots,
  useKeyboardShortcut,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { Pen2, QRCode as QRCodeIcon } from "@dub/ui/src/icons";
import { linkConstructor } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useContext, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { LinkFormData, LinkModalContext } from ".";
import { QRCodeDesign, useLinkQRModal } from "../link-qr-modal";

export function QRCodePreview() {
  const { isMobile } = useMediaQuery();
  const { workspaceLogo, workspacePlan, workspaceId } =
    useContext(LinkModalContext);

  const { watch } = useFormContext<LinkFormData>();
  const { key: rawKey, domain: rawDomain } = watch();
  const [key] = useDebounce(rawKey, 500);
  const [domain] = useDebounce(rawDomain, 500);

  const [data, setData] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-${workspaceId}`,
    {
      fgColor: "#000000",
      showLogo: true,
    },
  );

  const shortLinkUrl = useMemo(() => {
    return key && domain ? linkConstructor({ key, domain }) : undefined;
  }, [key, domain]);

  const showLogo = data.showLogo || workspacePlan === "free";

  const logo =
    workspaceLogo && workspacePlan !== "free"
      ? workspaceLogo
      : "https://assets.dub.co/logo.png";

  const { LinkQRModal, setShowLinkQRModal } = useLinkQRModal({
    props: {
      key: rawKey,
      domain: rawDomain,
    },
    onSave: (data) => setData(data),
  });

  useKeyboardShortcut("q", () => setShowLinkQRModal(true), {
    modal: true,
    enabled: Boolean(shortLinkUrl),
  });

  return (
    <div>
      <LinkQRModal />
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">QR Code</h2>
        <Button
          type="button"
          variant="outline"
          icon={<Pen2 className="mx-px size-4" />}
          className="h-7 w-fit px-1"
          onClick={() => setShowLinkQRModal(true)}
          disabledTooltip={
            key && domain ? undefined : "Enter a short link to customize"
          }
        />
      </div>
      <div className="relative mt-2 h-24 overflow-hidden rounded-md border border-gray-300">
        {!isMobile && (
          <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
        )}
        {shortLinkUrl ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={shortLinkUrl}
              initial={{ filter: "blur(2px)", opacity: 0.4 }}
              animate={{ filter: "blur(0px)", opacity: 1 }}
              exit={{ filter: "blur(2px)", opacity: 0.4 }}
              transition={{ duration: 0.1 }}
              className="relative flex size-full items-center justify-center"
            >
              <QRCode
                url={shortLinkUrl}
                fgColor={data.fgColor}
                showLogo={showLogo}
                logo={logo}
                scale={0.5}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2">
            <QRCodeIcon className="size-5 text-gray-700" />
            <p className="max-w-32 text-center text-xs text-gray-700">
              Enter a short link to generate a QR code
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
