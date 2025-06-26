"use client";

import { buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { guides, IntegrationType } from "./integrations";
import { Markdown } from "./markdown";

const integrationTypeToTitle: Record<IntegrationType, string> = {
  "client-sdk": "client-side script",
  "server-sdk": "server-side script",
  "track-leads": "tracking lead events",
  "track-sales": "tracking sale events",
};

export function Guide({ markdown }: { markdown: string }) {
  const pathname = usePathname();
  const { guide } = useParams() as { guide: string[] };
  const guideKey = guide[0];

  const selectedGuide = guides.find((g) => g.key === guideKey)!;

  const Icon = selectedGuide.icon;

  return (
    <>
      <hr className="mb-6 border-neutral-200" />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Icon className="size-8" />

          <Link
            href={pathname.replace(`/${guideKey}`, "")}
            className={cn(
              buttonVariants({
                variant: "secondary",
              }),
              "flex h-8 w-fit items-center justify-center rounded-lg border border-neutral-200 px-3 text-sm",
            )}
          >
            Select another method
          </Link>
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium leading-5 text-neutral-500">
            Set up {integrationTypeToTitle[selectedGuide.type]}
          </span>
          <span className="text-xl font-semibold leading-7 text-neutral-900">
            Instructions for {selectedGuide.title}
          </span>
        </div>

        <div className="space-y-6 rounded-2xl bg-white p-0 shadow-none">
          <Markdown>{markdown}</Markdown>

          <Link
            href={pathname}
            className={cn(
              buttonVariants({
                variant: "primary",
              }),
              "flex h-10 w-full items-center justify-center rounded-lg border border-neutral-200 px-4 text-sm",
            )}
          >
            I've completed this
          </Link>
        </div>
      </div>
    </>
  );
}
