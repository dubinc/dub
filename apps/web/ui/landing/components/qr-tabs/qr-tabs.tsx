"use client";

import { useAuthModal } from "@/ui/modals/auth-modal.tsx";
import { QRBuilderData } from "@/ui/modals/qr-builder";
import { QrBuilder } from "@/ui/qr-builder/qr-builder.tsx";
import { QrTabsTitle } from "@/ui/qr-builder/qr-tabs-title.tsx";
import { Rating } from "@/ui/qr-rating/rating.tsx";
import { useLocalStorage, useMediaQuery } from "@dub/ui";
import { forwardRef, useEffect } from "react";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";

export const QRTabs = forwardRef<HTMLDivElement>((_, ref) => {
  const { AuthModal, showModal } = useAuthModal();

  const [localQrDataToCreate, setLocalQrDataToCreate] =
    useLocalStorage<QRBuilderData | null>(`qr-data-to-create`, null);

  const { isMobile } = useMediaQuery();

  useEffect(() => {
    if (!isMobile) return;

    const handleFocusOut = (e: Event) => {
      const topMargin = isMobile ? 60 : 0;

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        setTimeout(() => {
          if (
            !document.activeElement ||
            document.activeElement === document.body
          ) {
            window.scrollTo({ top: topMargin, behavior: "smooth" });
          }
        }, 150);
      }
    };

    document.body.addEventListener("focusout", handleFocusOut);

    return () => {
      document.body.removeEventListener("focusout", handleFocusOut);
    };
  }, [isMobile]);

  const handleSaveQR = async (data: QRBuilderData) => {
    setLocalQrDataToCreate(data);
    showModal("signup");
  };

  return (
    <section className="bg-primary-100 w-full px-3 pb-6 md:pb-12">
      <div
        className="mx-auto flex max-w-[992px] flex-col items-center justify-center gap-6 md:gap-12"
        ref={ref}
      >
        <QrTabsTitle />

        <QrBuilder handleSaveQR={handleSaveQR} homepageDemo />

        <Rating />

        {!isMobile && <LogoScrollingBanner />}
      </div>

      <AuthModal />
    </section>
  );
});
