"use client";

import { InfoTooltip, TooltipContent } from "@dub/ui";

export default function WorkspaceDomainsClient() {
  return (
    <>
      <div className="grid gap-5">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex items-center gap-x-2">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Domains
            </h1>
            <InfoTooltip
              content={
                <TooltipContent
                  title="Learn more about how to add, configure, and verify custom domains on Dub."
                  href="https://dub.co/help/article/how-to-add-custom-domain"
                  target="_blank"
                  cta="Learn more"
                />
              }
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto"></div>
        </div>
      </div>
    </>
  );
}
