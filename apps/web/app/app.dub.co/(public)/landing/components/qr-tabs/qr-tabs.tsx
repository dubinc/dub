"use client";

import { useMediaQuery } from "@dub/ui";
import { forwardRef, useEffect } from "react";
import { useQrCustomization } from "../../../../(dashboard)/[slug]/new-qr/customization/hook/use-qr-customization.ts";
import { FILE_QR_TYPES, QR_TYPES } from "../../constants/get-qr-config.ts";
import { Rating } from "../rating-info/components/rating.tsx";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";
import { QrTabsTitle } from "./components/qr-tabs-title.tsx";
import { QrConfigTypeTabsMobile } from "./qr-config-type-tabs.mobile.tsx";
import { QrTypeTabs } from "./qr-type-tabs.tsx";

export const QRTabs = forwardRef<HTMLDivElement>((_, ref) => {
  const { isMobile } = useMediaQuery();

  useEffect(() => {
    if (!isMobile) return;

    const handleFocusOut = (e: Event) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        setTimeout(() => {
          if (
            !document.activeElement ||
            document.activeElement === document.body
          ) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }, 150);
      }
    };

    document.body.addEventListener("focusout", handleFocusOut);

    return () => {
      document.body.removeEventListener("focusout", handleFocusOut);
    };
  }, [isMobile]);

  const {
    options,
    qrCode,
    uploadedLogo,
    selectedSuggestedLogo,
    selectedSuggestedFrame,
    handlers,
    setData,
    isQrDisabled,
  } = useQrCustomization();

  const nonFileQrTypes = QR_TYPES.filter(
    (qrType) => !FILE_QR_TYPES.includes(qrType.id),
  );

  return (
    <section className="bg-primary-100 w-full px-3 pb-6 md:pb-12">
      <div
        className="mx-auto flex max-w-[992px] flex-col items-center justify-center gap-4 md:gap-12"
        ref={ref}
      >
        <QrTabsTitle />
        {isMobile ? (
          <QrConfigTypeTabsMobile
            options={options}
            qrCode={qrCode}
            uploadedLogo={uploadedLogo}
            selectedSuggestedLogo={selectedSuggestedLogo}
            selectedSuggestedFrame={selectedSuggestedFrame}
            handlers={handlers}
            setData={setData}
            isQrDisabled={isQrDisabled}
            nonFileQrTypes={nonFileQrTypes}
          />
        ) : (
          <QrTypeTabs
            options={options}
            qrCode={qrCode}
            uploadedLogo={uploadedLogo}
            selectedSuggestedLogo={selectedSuggestedLogo}
            selectedSuggestedFrame={selectedSuggestedFrame}
            handlers={handlers}
            setData={setData}
            isQrDisabled={isQrDisabled}
            nonFileQrTypes={nonFileQrTypes}
          />
        )}

        {isMobile && <Rating />}

        {!isMobile && <LogoScrollingBanner />}
      </div>
    </section>
  );
});
