"use client";

import { Button } from "@dub/ui";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function SignedInHint() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 min-[769px]:inset-x-auto min-[769px]:left-0 min-[769px]:z-40 min-[769px]:m-5 min-[769px]:w-auto">
      <div className="pointer-events-auto flex w-full flex-col gap-2 bg-gradient-to-t from-white from-30% via-white/95 to-white/0 px-4 pb-4 pr-24 pt-10 min-[769px]:w-auto min-[769px]:bg-none min-[769px]:p-0">
        <div className="flex min-w-0 items-center gap-1 text-xs text-neutral-600">
          <span className="shrink-0">You're signed in as</span>
          {session ? (
            <b className="truncate text-neutral-800">{session.user?.email}</b>
          ) : (
            <span className="h-3 w-32 animate-pulse rounded-md border border-neutral-300 bg-neutral-200" />
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
          className="h-8 w-fit rounded-lg px-3 text-xs shadow-sm"
        />
      </div>
    </div>
  );
}
