"use client";

import { Session } from '@/lib/auth';
import { useAuthModal } from "@/ui/modals/auth-modal";
import { Logo } from "@/ui/shared/logo.tsx";
import { Button } from "@dub/ui";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { getSession } from 'next-auth/react';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FC, useCallback, useEffect } from "react";

interface IHeaderProps {
  sessionId: string;
  authSession: Session;
}

export const Header: FC<Readonly<IHeaderProps>> = ({ sessionId, authSession }) => {
  const { AuthModal, showModal } = useAuthModal({ sessionId });
  const searchParams = useSearchParams();
  const router = useRouter();

  const openLogin = searchParams.get("login");
  const scrollToBuilder = searchParams.get("start");

  useEffect(() => {
    if (openLogin) {
      showModal("login");
    }
  }, [openLogin, showModal]);

  const handleScrollToQRGenerationBlock = useCallback(() => {
    const qrGenerationBlock = document.getElementById("qr-generation-block");
    if (qrGenerationBlock) {
      trackClientEvents({
        event: EAnalyticEvents.PAGE_CLICKED,
        params: {
          page_name: "landing",
          content_value: "create_qr",
          content_group: null,
          element_no: "1",
          event_category: "nonAuthorized",
        },
        sessionId,
      });

      qrGenerationBlock.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push("/?start=true");
  }, [router]);

  useEffect(() => {
    if (scrollToBuilder) {
      handleScrollToQRGenerationBlock();
    }
  }, [scrollToBuilder, handleScrollToQRGenerationBlock]);

  const handleOpenLogin = useCallback(async () => {
    const existingSession = await getSession();
    console.log("existingSession", existingSession);
    if (existingSession?.user) {
      router.push('/workspaces');
      return;
    }
    showModal("login");
  }, [showModal, router]);

  return (
    <>
      <header className="border-border sticky left-0 right-0 top-0 z-50 h-[52px] border-b bg-white backdrop-blur-lg md:h-16">
        <nav className="mx-auto flex h-full w-full max-w-screen-xl items-center justify-between px-3 md:container lg:px-20">
          <div className="flex h-[28px] items-center md:h-auto md:gap-6">
            <Link href="/">
              <Logo />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {!authSession?.user && (
              <>
                <Button
                  variant="outline"
                  onClick={handleOpenLogin}
                  text="Log In"
                  className="text-base font-medium"
                />

                <Button
                  variant="primary"
                  color="blue"
                  onClick={handleScrollToQRGenerationBlock}
                  text="Create QR code"
                  className="hidden text-base font-medium sm:block"
                />
              </>
            )}
          </div>
        </nav>
      </header>
      <AuthModal />
    </>
  );
};
