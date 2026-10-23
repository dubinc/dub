"use client";

import { Button, LoadingSpinner } from "@dub/ui";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export function NotFoundHint() {
  return (
    <SessionProvider>
      <NotFoundHintChild />
    </SessionProvider>
  );
}

function NotFoundHintChild() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  return (
    <>
      <h1 className="font-display bg-gradient-to-r from-black to-neutral-600 bg-clip-text text-5xl font-semibold text-transparent">
        404
      </h1>
      <div className="flex flex-col items-center gap-4">
        {session && (
          <p className="text-neutral-600">
            You're signed in as{" "}
            <b className="text-neutral-800">{session.user?.email}.</b>
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button
            text="Sign in as a different user"
            onClick={() => {
              setIsLoading(true);
              signOut();
            }}
            loading={isLoading}
          />
          <Link href="/workspaces">
            <Button
              text="View all my workspaces"
              variant="outline"
              className="mx-auto h-fit w-fit px-2 py-1 text-xs"
            />
          </Link>
        </div>
      </div>
    </>
  );
}
