"use client";

import Toolbar from "@/ui/layout/toolbar/toolbar";
import { PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@dub/ui";

export default function Layout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isWorkspacePage = pathname === "/onboarding/workspace";

  return (
    <>
      {children}
      <Toolbar show={["help"]} />
      {isWorkspacePage && (
        <div className="fixed bottom-0 left-0 z-40 m-5">
          <Button
            variant="secondary"
            text="Back to sign in"
            size="sm"
            onClick={() =>
              signOut({
                callbackUrl: "/login",
              })
            }
            className="h-8 text-xs rounded-lg px-3 shadow-sm"
          >
            Back to sign in
          </Button>
        </div>
      )}
    </>
  );
}
