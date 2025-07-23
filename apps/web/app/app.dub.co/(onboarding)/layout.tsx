"use client";

import Toolbar from "@/ui/layout/toolbar/toolbar";
import { PropsWithChildren, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@dub/ui";

export default function Layout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const isWorkspacePage = pathname === "/onboarding/workspace";
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <>
      {children}
      <Toolbar show={["help"]} />
      {isWorkspacePage && (
        <div className="fixed bottom-0 left-0 z-40 m-5 flex flex-col gap-2">
          <div className="flex items-center gap-1 text-neutral-600 text-xs">
            You're signed in as{" "}
            {session ? (
              <b className="text-neutral-800">{session.user?.email}</b>
            ) : (
              <span className="h-3 w-32 rounded-md border border-neutral-300 bg-neutral-200" />
            )}
          </div>
          <Button
            variant="secondary"
            text="Sign in as a different user"
            onClick={() => {
              setIsLoading(true);
              signOut({
                callbackUrl: "/login",
              });
            }}
            loading={isLoading}
            className="h-8 text-xs rounded-lg px-3 shadow-sm w-fit"
          />
        </div>
      )}
    </>
  );
}
