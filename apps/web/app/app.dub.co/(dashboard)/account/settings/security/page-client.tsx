"use client";

import useUser from "@/lib/swr/use-user";
import { RequestSetPassword } from "./request-set-password";
import { UpdatePassword } from "./update-password";

export const dynamic = "force-dynamic";

export default function SecurityPageClient() {
  const { loading, user } = useUser();

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col space-y-1 border-b border-neutral-200 p-6">
          <h2 className="text-base font-semibold">Password</h2>
          <div className="h-3 w-56 rounded-full bg-neutral-100"></div>
        </div>
        <div className="p-5">
          <div className="flex justify-between gap-2">
            <div className="h-3 w-56 rounded-full bg-neutral-100"></div>
            <div className="h-3 w-56 rounded-full bg-neutral-100"></div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-neutral-100"></div>
        </div>
      </div>
    );
  }

  return <>{user?.hasPassword ? <UpdatePassword /> : <RequestSetPassword />}</>;
}
