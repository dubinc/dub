import { QRCodeSVG } from "@/lib/qr";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, ShimmerDots, useMediaQuery } from "@dub/ui";
import { Pen2, QRCode } from "@dub/ui/src/icons";
import { linkConstructor } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { LinkFormData } from ".";

export function QRCodePreview() {
  const { isMobile } = useMediaQuery();
  const { logo, plan } = useWorkspace();

  const { watch } = useFormContext<LinkFormData>();
  const { key: rawKey, domain: rawDomain } = watch();
  const [key] = useDebounce(rawKey, 500);
  const [domain] = useDebounce(rawDomain, 500);

  const [fgColor] = useState("#000000");
  const [showLogo] = useState(true);

  const qrData = useMemo(
    () =>
      key && domain
        ? {
            value: linkConstructor({
              key: key,
              domain: domain,
              searchParams: {
                qr: "1",
              },
            }),
            bgColor: "#ffffff",
            fgColor,
            size: 1024,
            level: "Q", // QR Code error correction level: https://blog.qrstuff.com/general/qr-code-error-correction
            includeMargin: false,
            ...(showLogo && {
              imageSettings: {
                src:
                  logo && plan !== "free"
                    ? logo
                    : "https://assets.dub.co/logo.png",
                height: 256,
                width: 256,
                excavate: true,
              },
            }),
          }
        : null,
    [key, domain, showLogo],
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">QR Code</h2>
        <Button
          type="button"
          variant="outline"
          icon={<Pen2 className="mx-px size-4" />}
          className="h-7 w-fit px-1"
          onClick={() => toast.info("WIP")}
          disabledTooltip={
            key && domain ? undefined : "Enter a short link to customize"
          }
        />
      </div>
      <div className="relative mt-2 h-24 overflow-hidden rounded-md border border-gray-300">
        {!isMobile && (
          <ShimmerDots className="opacity-30 [mask-image:radial-gradient(40%_80%,transparent_50%,black)]" />
        )}
        {qrData ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={qrData.value}
              initial={{ filter: "blur(2px)", opacity: 0.4 }}
              animate={{ filter: "blur(0px)", opacity: 1 }}
              exit={{ filter: "blur(2px)", opacity: 0.4 }}
              transition={{ duration: 0.1 }}
              className="relative flex size-full items-center justify-center"
            >
              <QRCodeSVG
                value={qrData.value}
                size={qrData.size / 16}
                bgColor={qrData.bgColor}
                fgColor={qrData.fgColor}
                level={qrData.level}
                includeMargin={false}
                {...(qrData.imageSettings && {
                  imageSettings: {
                    ...qrData.imageSettings,
                    height: qrData.imageSettings
                      ? qrData.imageSettings.height / 16
                      : 0,
                    width: qrData.imageSettings
                      ? qrData.imageSettings.width / 16
                      : 0,
                  },
                })}
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2">
            <QRCode className="size-5 text-gray-700" />
            <p className="max-w-32 text-center text-xs text-gray-700">
              Enter a short link to generate a preview
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
