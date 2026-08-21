"use client";

import { Button, CircleQuestion } from "@dub/ui";
import { cn } from "@dub/utils";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function SignedInHint({
  fixedBreakpoint = "md",
  className,
}: {
  fixedBreakpoint?: "md" | "lg";
  className?: string;
}) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const fixedClasses =
    fixedBreakpoint === "lg"
      ? "lg:fixed lg:bottom-0 lg:left-0 lg:z-40 lg:m-5 lg:w-auto lg:border-0 lg:bg-transparent lg:p-0"
      : "md:fixed md:bottom-0 md:left-0 md:z-40 md:m-5 md:w-auto md:border-0 md:bg-transparent md:p-0";
  const hideInlineHelpClasses =
    fixedBreakpoint === "lg" ? "lg:hidden" : "md:hidden";

  return (
    <div
      className={cn(
        "w-full border-t border-neutral-200 bg-white p-4",
        fixedClasses,
        className,
      )}
    >
      <div className="mx-auto flex w-full flex-col gap-2 md:mx-0 md:w-auto md:max-w-none">
        <p className="text-xs text-neutral-600">
          You're signed in as{" "}
          {session ? (
            <b className="break-all text-neutral-800">{session.user?.email}</b>
          ) : (
            <span className="h-3 w-32 animate-pulse rounded-md border border-neutral-300 bg-neutral-200" />
          )}
        </p>

        <div className="flex items-center justify-between gap-2 md:block">
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
            className="h-8 w-fit rounded-lg px-3 text-xs shadow-sm"
          />
          <a
            href="https://dub.co/contact/support"
            target="_blank"
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100",
              hideInlineHelpClasses,
            )}
            aria-label="Help"
          >
            <CircleQuestion className="size-5" strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
}
