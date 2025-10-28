"use client";

import { saveQrDataToRedisAction } from "@/lib/actions/pre-checkout-flow/save-qr-data-to-redis.ts";
import { useAuthModal } from "@/ui/modals/auth-modal.tsx";
import { EQRType } from "@/ui/qr-builder/constants/get-qr-config.ts";
import { QrBuilder } from "@/ui/qr-builder/qr-builder.tsx";
import { QrTabsTitle } from "@/ui/qr-builder/qr-tabs-title.tsx";
import { QRBuilderData } from "@/ui/qr-builder/types/types.ts";
import { Rating } from "@/ui/qr-rating/rating.tsx";
import { useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { FC, forwardRef, Ref, useEffect } from "react";
import { LogoScrollingBanner } from "./components/logo-scrolling-banner.tsx";
import { getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQrOperations } from '@/ui/qr-code/hooks/use-qr-operations.ts';
import { Session } from '@/lib/auth';

interface IQRTabsProps {
  sessionId: string;
  typeToScrollTo: EQRType | null;
  handleResetTypeToScrollTo: () => void;
}

export const QRTabs: FC<
  Readonly<IQRTabsProps> & { ref?: Ref<HTMLDivElement> }
> = forwardRef(
  ({ sessionId, typeToScrollTo, handleResetTypeToScrollTo }, ref) => {
    const { AuthModal, showModal } = useAuthModal({ sessionId });
    const router = useRouter();
    const { createQr } = useQrOperations();

    const { executeAsync: saveQrDataToRedis } = useAction(
      saveQrDataToRedisAction,
    );

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

    const handleSaveQR = async (data: QRBuilderData) => {
      const existingSession = await getSession();
      console.log("existingSession", existingSession);
      const user = existingSession?.user as Session['user'] || undefined;

      if (existingSession?.user) {
        const createdQrId = await createQr(data, user?.defaultWorkspace);
        console.log("createdQrId", createdQrId);
        router.push(`/?qrId=${createdQrId}`);
        return;
      }

      console.log("handleSaveQR", sessionId);
      saveQrDataToRedis({ sessionId, qrData: data });

      showModal("signup");
    };

    return (
      <section className="bg-primary-100 w-full px-3 py-10 lg:py-14">
        <div
          className="mx-auto flex max-w-[992px] flex-col items-center justify-center gap-6 lg:gap-12"
          ref={ref}
        >
          <QrTabsTitle />

          <QrBuilder
            sessionId={sessionId}
            handleSaveQR={handleSaveQR}
            homepageDemo
            typeToScrollTo={typeToScrollTo}
            key={typeToScrollTo}
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
