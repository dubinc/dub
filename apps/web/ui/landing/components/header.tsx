"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Session } from "@/lib/auth";
import { useAuthModal } from "@/ui/modals/auth-modal";
import { Logo } from "@/ui/shared/logo.tsx";
import { trackClientEvents } from "core/integration/analytic";
import { EAnalyticEvents } from "core/integration/analytic/interfaces/analytic.interface";
import { getSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FC, useCallback, useEffect } from "react";

interface IHeaderProps {
  sessionId: string;
  authSession: Session;
}

export const Header: FC<Readonly<IHeaderProps>> = ({
  sessionId,
  authSession,
}) => {
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
  }, [router, sessionId]);

  useEffect(() => {
    if (scrollToBuilder) {
      handleScrollToQRGenerationBlock();
    }
  }, [scrollToBuilder, handleScrollToQRGenerationBlock]);

  const handleOpenLogin = useCallback(async () => {
    const existingSession = await getSession();
    console.log("existingSession", existingSession);
    if (existingSession?.user) {
      router.push("/workspaces");
      return;
    }
    showModal("login");
  }, [showModal, router]);

  const handleOpenMyQRCodes = useCallback(() => {
    router.push("/workspaces");
  }, [router]);

  return (
    <>
      <header className="border-border sticky top-0 z-50 border-b bg-white backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
          <Link href="/">
            <Logo className="gap-3" />
          </Link>

          <div className="flex items-center gap-4 md:gap-6">
            {!authSession?.user ? (
              <>
                <Button
                  variant="ghost"
                  onClick={handleOpenLogin}
                  className="p-0 text-base font-medium text-neutral-200 transition-colors duration-300 hover:bg-transparent hover:text-secondary"
                  size="lg"
                >
                  Log In
                </Button>
                <Separator orientation="vertical" className="!h-6 max-md:hidden" />
                <Button
                  onClick={handleScrollToQRGenerationBlock}
                  className="hidden bg-secondary hover:bg-secondary/90 sm:inline-flex"
                  size="lg"
                >
                  Create QR code
                </Button>
              </>
            ) : (
              <Button
                onClick={handleOpenMyQRCodes}
                className=" bg-secondary text-base font-medium text-white hover:bg-secondary/90"
                size="lg"
              >
                My QR Codes
              </Button>
            )}
          </div>
        </div>
      </header>
      <AuthModal />
    </>
  );
};
