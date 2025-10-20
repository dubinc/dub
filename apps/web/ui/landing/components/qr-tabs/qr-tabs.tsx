"use client";

import { useAuthModal } from "@/ui/modals/auth-modal.tsx";
import {
  convertNewBuilderToStorageFormat,
  TNewQRBuilderData,
  TQRBuilderDataForStorage,
} from "@/ui/qr-builder-new/helpers/data-converters";
import { QRBuilderNew } from "@/ui/qr-builder-new/index.tsx";
import { EQRType } from "@/ui/qr-builder-new/constants/get-qr-config.ts";
import { QrTabsTitle } from "@/ui/qr-builder/qr-tabs-title.tsx";
import { Rating } from "@/ui/qr-rating/rating.tsx";
import { useLocalStorage, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { FC, forwardRef, Ref, useEffect, useState } from "react";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";
import { saveQrDataToRedisAction } from "@/lib/actions/pre-checkout-flow/save-qr-data-to-redis.ts";

interface IQRTabsProps {
  sessionId: string;
  typeToScrollTo: EQRType | null;
  handleResetTypeToScrollTo: () => void;
}

export const QRTabs: FC<
  Readonly<IQRTabsProps> & { ref?: Ref<HTMLDivElement> }
> = forwardRef(
  ({ sessionId, typeToScrollTo, handleResetTypeToScrollTo }, ref) => {
    console.log("qr tabs");
    const { AuthModal, showModal } = useAuthModal({ sessionId });

    const { executeAsync: saveQrDataToRedis } = useAction(
      saveQrDataToRedisAction,
    );

    const [qrDataToCreate, setQrDataToCreate] =
      useLocalStorage<TQRBuilderDataForStorage | null>(`qr-data-to-create`, null);

    const [isProcessingSignup, setIsProcessingSignup] = useState(false);

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
              window.scrollTo({ top: 60, behavior: "smooth" });
            }
          }, 150);
        }
      };

      document.body.addEventListener("focusout", handleFocusOut);

      return () => {
        document.body.removeEventListener("focusout", handleFocusOut);
      };
    }, [isMobile]);

    const handleNewBuilderDownload = async (data: TNewQRBuilderData) => {
      if (isProcessingSignup) return;
      setIsProcessingSignup(true);

      try {
        const storageData = convertNewBuilderToStorageFormat(data);
        setQrDataToCreate(storageData);

        await saveQrDataToRedis({
          sessionId,
          qrData: storageData,
        });

        showModal("signup");
      } catch (error) {
        console.error("❌ Error saving new builder QR data:", error);
        showModal("signup"); // Still show signup even if save fails
      } finally {
        setTimeout(() => setIsProcessingSignup(false), 1000);
      }
    };

    return (
      <section className="bg-primary-100 w-full px-3 py-10 lg:py-14">
        <div
          className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-6 lg:gap-12"
          ref={ref}
        >
          <QrTabsTitle />
          <QRBuilderNew
            homepageDemo={true}
            sessionId={sessionId}
            onSave={handleNewBuilderDownload}
            typeToScrollTo={typeToScrollTo}
            handleResetTypeToScrollTo={handleResetTypeToScrollTo}
          />

          <Rating />

          {!isMobile && <LogoScrollingBanner />}
        </div>

        <AuthModal />
      </section>
    );
  },
);