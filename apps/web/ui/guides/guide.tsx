"use client";

import {
  Anthropic,
  BookOpen,
  Button,
  buttonVariants,
  Check,
  ChevronLeft,
  OpenAI,
  Popover,
  useCopyToClipboard,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowUpRight, ChevronDown, Copy } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { InstallStripeIntegrationButton } from "./install-stripe-integration-button";
import { guides, IntegrationType } from "./integrations";
import { GuidesMarkdown } from "./markdown";

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
  const [openDropdown, setOpenDropdown] = useState(false);

  const pathname = usePathname();
  const backHref = `${pathname.replace(`/${guideKey}`, "")}?step=${selectedGuide.type}`;

  const [copied, copyToClipboard] = useCopyToClipboard();

  const prompt = `Read from ${selectedGuide.url} so I can ask questions about it.`;

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

          <div className="flex items-center overflow-hidden rounded-lg border border-neutral-200">
            <Link
              href={selectedGuide.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                text="Read full guide"
                variant="secondary"
                className="h-8 rounded-none border-0 px-3"
                icon={<BookOpen className="size-3.5" />}
              />
            </Link>

            <div className="h-8 w-px bg-neutral-200" />

            <Popover
              content={
                <div className="flex w-full flex-col space-y-px rounded-lg bg-white p-1 sm:min-w-64">
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
                    onClick={() =>
                      copyToClipboard(markdown, {
                        onSuccess: () => {
                          toast.success("Content copied as markdown");
                        },
                      })
                    }
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-200 transition-colors hover:border-neutral-300">
                      {copied ? (
                        <Check className="size-4 text-neutral-600" />
                      ) : (
                        <Copy className="size-4 text-neutral-600" />
                      )}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Copy content</span>
                      <span className="text-xs text-neutral-500">
                        Copy page as Markdown for LLMs
                      </span>
                    </div>
                  </button>

                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
                    onClick={() => {
                      const chatgptUrl = `https://chatgpt.com?hints=search&prompt=${encodeURIComponent(prompt)}`;
                      console.log("chatgptUrl", chatgptUrl);
                      window.open(chatgptUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-200 transition-colors hover:border-neutral-300">
                      <OpenAI className="size-4 text-neutral-600" />
                    </div>
                    <div className="flex flex-1 flex-col items-start">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Open in ChatGPT</span>
                        <ArrowUpRight className="size-3.5 text-neutral-600" />
                      </div>
                      <span className="text-xs text-neutral-500">
                        Ask questions about this step
                      </span>
                    </div>
                  </button>

                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
                    onClick={() => {
                      const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
                      window.open(claudeUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-200 transition-colors hover:border-neutral-300">
                      <Anthropic className="size-4 text-neutral-600" />
                    </div>
                    <div className="flex flex-1 flex-col items-start">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Open in Claude</span>
                        <ArrowUpRight className="size-3.5 text-neutral-600" />
                      </div>
                      <span className="text-xs text-neutral-500">
                        Ask questions about this step
                      </span>
                    </div>
                  </button>
                </div>
              }
              align="end"
              openPopover={openDropdown}
              setOpenPopover={setOpenDropdown}
            >
              <button
                onClick={() => setOpenDropdown(!openDropdown)}
                className={cn(
                  "flex h-8 items-center justify-center rounded-none border-0 bg-white px-2 transition-colors",
                  "hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-black/50",
                  openDropdown && "bg-neutral-50",
                )}
              >
                <ChevronDown className="size-3.5 text-neutral-600" />
              </button>
            </Popover>
          </div>
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
          <GuidesMarkdown>{markdown}</GuidesMarkdown>

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
