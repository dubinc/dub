"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { CopyButton } from "@dub/ui";

export default function WorkspaceId() {
  const { id } = useWorkspace();

  return (
    <>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Workspace ID</h2>
            <p className="text-sm text-neutral-500">
              Unique ID of your workspace on Dub.
            </p>
          </div>
          {id ? (
            <div className="flex w-full max-w-md items-center justify-between rounded-md border border-neutral-300 bg-white p-2">
              <p className="text-sm text-neutral-500">{id}</p>
              <CopyButton value={id} className="rounded-md" />
            </div>
          ) : (
            <div className="h-[2.35rem] w-full max-w-md animate-pulse rounded-md bg-neutral-200" />
          )}
        </div>
        <div className="flex items-center justify-between rounded-b-lg border-t border-neutral-200 bg-neutral-50 px-3 py-5 sm:px-10">
          <p className="text-sm text-neutral-500">
            Used to identify your workspace when interacting with the{" "}
            <a
              href="https://dub.co/api"
              target="_blank"
              className="underline underline-offset-2 transition-colors hover:text-neutral-700"
            >
              Dub API
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}
