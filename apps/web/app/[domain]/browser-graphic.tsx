"use client";

import { cn } from "@dub/utils";

export function BrowserGraphic({ domain }: { domain: string }) {
  return (
    <div className="w-full p-1 [mask-image:linear-gradient(black_50%,transparent_90%)]">
      <div className="w-full rounded-t-lg border border-neutral-300 ring ring-black/5">
        <div className="flex items-center justify-between gap-4 rounded-t-[inherit] bg-white px-5 py-3">
          <div className="hidden grow basis-0 items-center gap-2 sm:flex">
            {["bg-red-400", "bg-yellow-400", "bg-green-400"].map((c) => (
              <div
                key={c}
                className={cn(
                  "size-[11px] rounded-full border border-black/10",
                  c,
                )}
              />
            ))}
          </div>
          <div className="relative min-w-0 grow truncate rounded-lg bg-[radial-gradient(60%_80%_at_50%_0%,#ddd,#f5f5f5)] px-4 py-2 text-sm font-medium leading-none">
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#0001,transparent)]" />
            {domain}
          </div>
          <div className="hidden grow basis-0 sm:block" />
        </div>
        <div className="h-12 border-t border-neutral-200 bg-neutral-100/50" />
      </div>
    </div>
  );
}
