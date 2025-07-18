"use client";

import { BookOpen, Button, buttonVariants, ChevronLeft } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { InstallStripeIntegrationButton } from "./install-stripe-integration-button";
import { guides, IntegrationType } from "./integrations";
import { Markdown } from "./markdown";

const integrationTypeToTitle: Record<IntegrationType, string> = {
  "client-sdk": "Install client-side script",
  "track-lead": "Track lead events",
  "track-sale": "Track sale events",
};

export function Guide({ markdown }: { markdown: string }) {
  const { guide } = useParams() as { guide: string[] };
  const guideKey = guide[0];
  const selectedGuide = guides.find((g) => g.key === guideKey)!;
  const Icon = selectedGuide.icon;

  const pathname = usePathname();
  const backHref = `${pathname.replace(`/${guideKey}`, "")}?step=${selectedGuide.type}`;

  return (
    <>
      <hr className="mb-6 border-neutral-200" />
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between">
          <Link href={backHref}>
            <Button
              variant="secondary"
              className="h-8 w-fit rounded-lg border-none bg-neutral-100 px-2"
              icon={<ChevronLeft className="size-3.5 text-neutral-900" />}
            />
          </Link>

          <Link href={selectedGuide.url} target="_blank">
            <Button
              text="Read full guide"
              variant="secondary"
              className="h-8 w-fit rounded-lg px-3"
              icon={<BookOpen className="size-3.5" />}
            />
          </Link>
        </div>

        <div>
          <Icon className="size-8" />
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-medium leading-5 text-neutral-500">
            {integrationTypeToTitle[selectedGuide.type]}
          </span>
          <span className="text-xl font-semibold leading-7 text-neutral-900">
            Instructions for {selectedGuide.description || selectedGuide.title}
          </span>
        </div>

        <div className="space-y-6 rounded-2xl bg-white p-0 shadow-none">
          {selectedGuide.type === "track-sale" &&
            selectedGuide.key.startsWith("stripe") && (
              <InstallStripeIntegrationButton />
            )}
          <Markdown>{markdown}</Markdown>

          <Link
            href={backHref}
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
