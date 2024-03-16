"use client";

import useProject from "@/lib/swr/use-project";
import { CopyButton } from "@dub/ui";

export default function ProjectID() {
  const { id } = useProject();
  const workspaceId = `w_${id}`

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="relative flex flex-col space-y-6 p-5 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">Workspace ID</h2>
            <p className="text-sm text-gray-500">
              {`You'll need this ID to interact with the ${process.env.NEXT_PUBLIC_APP_NAME} API.`}
            </p>
          </div>
          <div className="flex w-full max-w-md items-center justify-between rounded-md border border-gray-300 bg-white p-2">
            <p className="text-sm text-gray-500">{workspaceId}</p>
            <CopyButton value={workspaceId} className="rounded-md" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-b-lg border-t border-gray-200 bg-gray-50 px-3 py-5 sm:px-10">
          <a
            href="https://dub.co/help/article/what-is-a-workspace"
            target="_blank"
            className="text-sm text-gray-400 underline underline-offset-4 transition-colors hover:text-gray-700"
          >
            Learn more about Workspace ID.
          </a>
        </div>
      </div>
    </>
  );
}
