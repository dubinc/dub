"use client";

import { CopyButton } from "@dub/ui";
import { useSession } from "next-auth/react";

export default function UserId() {
  const { data: session } = useSession() as
    | {
        data: { user: { id: string } };
      }
    | { data: null };

  return (
    <>
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-6">
          <div className="flex flex-col space-y-1">
            <h2 className="text-base font-semibold">Your User ID</h2>
            <p className="text-sm text-neutral-500">
              This is your unique account identifier on Dub.
            </p>
          </div>
          {session?.user?.id ? (
            <div className="flex w-full max-w-md items-center justify-between rounded-md border border-neutral-300 bg-white p-2">
              <p className="text-sm text-neutral-500">{session.user.id}</p>
              <CopyButton value={session.user.id} className="rounded-md" />
            </div>
          ) : (
            <div className="h-[2.35rem] w-full max-w-md animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>

        <div className="flex items-center justify-between space-x-4 rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-6 py-5">
          <p className="text-sm text-neutral-500">
            This may be used to identify your account in the API.
          </p>
        </div>
      </div>
    </>
  );
}
