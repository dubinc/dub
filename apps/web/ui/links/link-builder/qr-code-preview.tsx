import useDomain from "@/lib/swr/use-domain";
import useWorkspace from "@/lib/swr/use-workspace";
import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { QRCode } from "@/ui/shared/qr-code";
import {
  Button,
  InfoTooltip,
  ShimmerDots,
  SimpleTooltipContent,
  useInViewport,
  useLocalStorage,
  useMediaQuery,
} from "@dub/ui";
import { Pen2, QRCode as QRCodeIcon } from "@dub/ui/icons";
import { DUB_QR_LOGO, linkConstructor } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useDebounce } from "use-debounce";
import { QRCodeDesign, useLinkQRModal } from "../../modals/link-qr-modal";
import { useLinkBuilderKeyboardShortcut } from "./use-link-builder-keyboard-shortcut";

export function QRCodePreview() {
  const { isMobile } = useMediaQuery();
  const {
    id: workspaceId,
    logo: workspaceLogo,
    plan: workspacePlan,
  } = useWorkspace();

  const { control } = useFormContext<LinkFormData>();
  const [rawKey, rawDomain] = useWatch({ control, name: ["key", "domain"] });
  const [key] = useDebounce(rawKey, 500);
  const [domain] = useDebounce(rawDomain, 500);

  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useInViewport(ref);

  const { logo: domainLogo } = useDomain({
    slug: rawDomain,
    enabled: isVisible,
  });

  const [data, setData] = useLocalStorage<QRCodeDesign>(
    `qr-code-design-${workspaceId}`,
    {
      fgColor: "#000000",
      hideLogo: true,
    },
  );

  const shortLinkUrl = useMemo(() => {
    return key && domain ? linkConstructor({ key, domain }) : undefined;
  }, [key, domain]);

  const hideLogo = data.hideLogo && workspacePlan !== "free";
  const logo =
    workspacePlan === "free"
      ? DUB_QR_LOGO
      : domainLogo || workspaceLogo || DUB_QR_LOGO;

  const { LinkQRModal, setShowLinkQRModal } = useLinkQRModal({
    props: {
      domain: rawDomain,
      key: rawKey,
    },
    onSave: (data) => setData(data),
  });

  useLinkBuilderKeyboardShortcut("q", () => setShowLinkQRModal(true), {
    enabled: Boolean(shortLinkUrl),
  });

  return (
    <div ref={ref}>
      <LinkQRModal />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-neutral-700">QR Code</h2>
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
      </div>
      <div className="relative z-0 mt-2 h-24 overflow-hidden rounded-md border border-neutral-300">
        <Button
          type="button"
          variant="secondary"
          icon={<Pen2 className="mx-px size-4" />}
          className="absolute right-2 top-2 z-10 h-8 w-fit bg-white px-1.5"
          onClick={() => setShowLinkQRModal(true)}
        />
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
                hideLogo={hideLogo}
                logo={logo}
                scale={0.5}
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
