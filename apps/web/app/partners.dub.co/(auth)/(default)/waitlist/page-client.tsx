"use client";

import { buttonVariants } from "@dub/ui";
import { LinkedIn, Twitter } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export function PartnersWaitlistPageClient() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto my-10 w-full max-w-md md:mt-16 lg:mt-20">
      <div className="rounded-lg border border-neutral-200 bg-white p-4 py-6 sm:p-8 sm:pb-10">
        <h1 className="text-lg font-medium text-neutral-800">
          You're on the waitlist
        </h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          We'll be in touch once we're ready.
        </p>
        <div className="my-8 h-px w-full bg-neutral-300" />
        <h2 className="text-sm font-medium text-neutral-800">
          Subscribe to Dub news
        </h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          Stay up to date with everything important.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4">
          <Link
            href="https://x.com/dubdotco"
            target="_blank"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-9 items-center justify-center rounded-md border px-4 text-center text-sm",
            )}
          >
            <Twitter className="mr-2 size-4" />
            @dubdotco
          </Link>
          <Link
            href="https://www.linkedin.com/company/dubinc"
            target="_blank"
            className={cn(
              buttonVariants({ variant: "secondary" }),
              "flex h-9 items-center justify-center rounded-md border px-4 text-center text-sm",
            )}
          >
            <LinkedIn className="mr-2 size-4 text-current" />
            dubinc
          </Link>
        </div>
        <div className="mt-8 text-[0.8rem] text-neutral-500">
          <p>
            You're logged in as{" "}
            {session?.user?.email ? (
              <span className="font-medium text-neutral-700">
                {session.user.email}
              </span>
            ) : (
              <span className="inline-flex h-2 w-48 rounded-md bg-neutral-100" />
            )}
          </p>
          <button
            onClick={() => signOut()}
            className="underline underline-offset-2 hover:text-neutral-800"
          >
            Sign out to switch accounts
          </button>
        </div>
      </div>
    </div>
  );
}
