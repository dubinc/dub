"use client";

import { useAuthModal } from "@/ui/modals/auth-modal";
import { Logo } from "@/ui/shared/logo.tsx";
import { Button } from "@dub/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FC, useCallback, useEffect } from "react";

interface IHeaderProps {
  sessionId: string;
}

export const Header: FC<Readonly<IHeaderProps>> = ({ sessionId }) => {
  const { AuthModal, showModal } = useAuthModal({ sessionId });
  const searchParams = useSearchParams();

  const openLogin = searchParams.get("login");

  useEffect(() => {
    console.log("openLogin", openLogin);
    if (openLogin) {
      console.log("here");
      showModal("login");
    }
  }, [openLogin, showModal]);

  const handleScrollToQRGenerationBlock = useCallback(() => {
    const qrGenerationBlock = document.getElementById("qr-generation-block");
    if (qrGenerationBlock) {
      qrGenerationBlock.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

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
            <Button
              variant="outline"
              onClick={() => showModal("login")}
              text="Log In"
              className="text-base font-medium"
            />

            <Button
              variant="primary"
              color="blue"
              onClick={handleScrollToQRGenerationBlock}
              text="Create QR code"
              className="text-base font-medium hidden sm:block"
            />
          </div>
        </nav>
      </header>
      <AuthModal />
    </>
  );
};
