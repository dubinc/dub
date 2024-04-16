"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { MaxWidthWrapper, useRouterStuff } from "@dub/ui";
import { Lock } from "lucide-react";

export default function WorkspaceExceededClicks() {
  const { nextPlan } = useWorkspace();
  const { queryParams } = useRouterStuff();

  return (
    <MaxWidthWrapper>
      <div className="my-10 flex flex-col items-center justify-center rounded-md border border-gray-200 bg-white py-12">
        <div className="rounded-full bg-gray-100 p-3">
          <Lock className="h-6 w-6 text-gray-600" />
        </div>
        <h1 className="my-3 text-xl font-semibold text-gray-700">
          Stats Locked
        </h1>
        <p className="z-10 max-w-sm text-center text-sm text-gray-600">
          Your workspace has exceeded your monthly clicks limits. We're still
          collecting data on your links, but you need to upgrade to view them.
        </p>
        <img
          src="/_static/illustrations/video-park.svg"
          alt="No links yet"
          width={400}
          height={400}
          className="-my-8"
        />
        <button
          onClick={() =>
            queryParams({
              set: {
                upgrade: nextPlan.name.toLowerCase(),
              },
            })
          }
          className="z-10 rounded-md border border-black bg-black px-10 py-2 text-sm font-medium text-white transition-all duration-75 hover:bg-white hover:text-black"
        >
          Upgrade to {nextPlan.name}
        </button>
      </div>
    </MaxWidthWrapper>
  );
}
