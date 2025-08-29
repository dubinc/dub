"use client";

import { useAuthModal } from "@/ui/modals/auth-modal";
import { Logo } from "@/ui/shared/logo.tsx";
import { Button, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FC, useEffect } from "react";

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
            <Button variant="ghost" onClick={() => showModal("login")}>
              <Text size="3" weight="medium" className="text-neutral">
                Log In
              </Text>
            </Button>

            {/*<Button*/}
            {/*  variant="solid"*/}
            {/*  color="blue"*/}
            {/*  onClick={() => showModal("signup")}*/}
            {/*>*/}
            {/*  <Text size="3" weight="medium">*/}
            {/*    Sign Up*/}
            {/*  </Text>*/}
            {/*</Button>*/}
          </div>
        </nav>
      </header>
      <AuthModal />
    </>
  );
};
