"use client";

import { Button } from "@dub/ui";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function SignedInHint() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="static mt-1 m-5 flex flex-col gap-2 items-center lg:mt-0 lg:fixed lg:bottom-0 lg:left-0 lg:z-40 lg:items-start">
      <div className="flex items-center gap-1 text-xs text-neutral-600">
        You're signed in as{" "}
        {session ? (
          <b className="text-neutral-800">{session.user?.email}</b>
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
  );
}
