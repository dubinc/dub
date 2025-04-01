"use client";

import { Button } from "@dub/ui";
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
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  return session ? (
    <>
      <p className="text-neutral-600">
        You're signed in as{" "}
        <b className="text-neutral-800">{session.user?.email}</b>.
      </p>
      <Button
        text="Sign in as a different user"
        onClick={() => {
          setIsLoading(true);
          signOut();
        }}
        loading={isLoading}
        className="w-fit"
      />
    </>
  ) : (
    <Link
      href="/"
      className="flex h-9 w-fit items-center justify-center rounded-md border border-black bg-black px-4 text-sm text-white hover:bg-neutral-800 hover:ring-4 hover:ring-neutral-200"
    >
      Go back home
    </Link>
  );
}
