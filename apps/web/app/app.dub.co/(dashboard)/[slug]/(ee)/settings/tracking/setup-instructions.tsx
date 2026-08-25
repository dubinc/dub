"use client";

import { guides, IntegrationGuide, stackItems } from "@/ui/guides/integrations";
import { GuidesMarkdown } from "@/ui/guides/markdown";
import { BookOpen, Button, CopyButton, Tooltip } from "@dub/ui";
import {
  ChatGPTIcon,
  ChatTask,
  CircleDashed,
  Claude,
  Cursor,
  Grok,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useState } from "react";
import { useDynamicGuide } from "./use-dynamic-guide";

const DEVELOPER_GUIDES = [
  {
    title: "Client-side SDK install guide",
    href: "https://dub.co/docs/sdks/client-side",
  },
  {
    title: "Tracking lead events",
    href: "https://dub.co/docs/conversions/leads/introduction",
  },
  {
    title: "Tracking sale events",
    href: "https://dub.co/docs/conversions/sales/introduction",
  },
];

const OPEN_IN_APPS = [
  {
    id: "claude",
    name: "Claude",
    icon: Claude,
    href: (prompt: string) =>
      `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    icon: ChatGPTIcon,
    href: (prompt: string) =>
      `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`,
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: Cursor,
    href: (prompt: string) =>
      `https://cursor.com/link/prompt?text=${encodeURIComponent(prompt)}`,
  },
  {
    id: "grok",
    name: "Grok",
    icon: Grok,
    href: (prompt: string) =>
      `https://grok.com/?q=${encodeURIComponent(prompt)}`,
  },
] as const;

function getInstallPrompt(url: string) {
  return `Read from ${url} and implement it.`;
}

function OpenInApps({ prompt }: { prompt: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium leading-4 tracking-[-0.02em] text-neutral-500">
        Open in
      </span>
      <div className="flex items-center">
        {OPEN_IN_APPS.map((app) => {
          const Icon = app.icon;

          return (
            <Tooltip key={app.id} content={`Open in ${app.name}`}>
              <button
                type="button"
                aria-label={`Open in ${app.name}`}
                onClick={() =>
                  window.open(app.href(prompt), "_blank", "noopener,noreferrer")
                }
                className={cn(
                  "flex size-6 items-center justify-center rounded-lg text-neutral-900",
                  "transition-[transform,background-color] duration-150 ease-out",
                  "hover:bg-neutral-100 active:scale-[0.97]",
                  "motion-reduce:transition-none motion-reduce:active:scale-100",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function getSelectedStackItems(stackIds: string[]) {
  return stackItems.filter((item) => stackIds.includes(item.id));
}

function getPrimaryGuide(stackIds: string[]): IntegrationGuide | undefined {
  const selected = getSelectedStackItems(stackIds);
  const preferred =
    selected.find((item) => item.type === "client-sdk") ??
    selected.find((item) => item.type === "track-lead") ??
    selected.find((item) => item.type === "track-sale") ??
    selected[0];

  if (!preferred) {
    return undefined;
  }

  return guides.find((guide) => guide.key === preferred.guideKeys[0]);
}

export function isSetupInstructionsReady(
  stack: string[],
  hasHostname: boolean,
) {
  return stack.length > 0 && hasHostname;
}

export function DeveloperGuides() {
  return (
    <div className="flex flex-col gap-1.5">
      <h4 className="text-xs font-semibold leading-4 tracking-[-0.02em] text-neutral-600">
        Read developer guides
      </h4>
      <div className="flex flex-col gap-1.5">
        {DEVELOPER_GUIDES.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-1.5 text-xs font-medium leading-4 tracking-[-0.02em] text-neutral-500 transition-colors duration-150 hover:text-neutral-700"
          >
            <BookOpen className="size-3.5 shrink-0" />
            {guide.title} ↗
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SetupInstructions({
  stack,
  hasHostname,
}: {
  stack: string[];
  hasHostname: boolean;
}) {
  const ready = isSetupInstructionsReady(stack, hasHostname);
  const primaryGuide = getPrimaryGuide(stack);
  const clientSdkItems = getSelectedStackItems(stack).filter(
    (item) => item.type === "client-sdk",
  );

  if (!ready) {
    return (
      <div className="flex h-[114px] w-full flex-col items-center justify-center gap-2 rounded-xl bg-neutral-50 py-6">
        <CircleDashed className="size-[18px] shrink-0 text-neutral-500" />
        <p className="text-center text-sm font-medium leading-5 tracking-[-0.02em] text-neutral-500">
          Select your stack, add at least one hostname to generate install
          instructions
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {primaryGuide && <MainPromptCard guide={primaryGuide} />}

      {clientSdkItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {clientSdkItems.map((item) => {
            const guide = guides.find((g) => g.key === item.guideKeys[0]);
            if (!guide) {
              return null;
            }

            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="flex h-[52px] w-full items-center justify-between gap-3 rounded-[10px] bg-neutral-50 p-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon className="size-5 shrink-0" />
                  <span className="truncate text-sm font-medium text-neutral-800">
                    {item.title}
                  </span>
                </div>
                <Button
                  text="Read install guide"
                  variant="secondary"
                  className="h-8 w-fit shrink-0 px-2.5"
                  onClick={() =>
                    window.open(guide.url, "_blank", "noopener,noreferrer")
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MainPromptCard({ guide }: { guide: IntegrationGuide }) {
  const { loading, guideMarkdown } = useDynamicGuide({ guide: guide.key });
  const [expanded, setExpanded] = useState(false);
  const prompt = getInstallPrompt(guide.url);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ChatTask className="size-5 shrink-0 text-neutral-800" />
          <h4 className="text-sm font-semibold leading-5 tracking-[-0.02em] text-neutral-800">
            Main prompt
          </h4>
        </div>
        <OpenInApps prompt={prompt} />
      </div>

      <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <CopyButton
          value={prompt}
          className="absolute right-3 top-3 z-10 flex size-6 items-center justify-center rounded-lg border border-neutral-200 p-0 hover:bg-neutral-50 [&_svg]:size-3.5"
          successMessage="Prompt copied to clipboard"
        />

        <div className="p-4 pb-0">
          {expanded && loading ? (
            <div className="space-y-3 pr-8">
              <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
              <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
            </div>
          ) : expanded && guideMarkdown ? (
            <div className="pr-8">
              <GuidesMarkdown>{guideMarkdown}</GuidesMarkdown>
            </div>
          ) : (
            <p className="pr-8 font-mono text-[13px] leading-6 text-neutral-800">
              {prompt}
            </p>
          )}
        </div>

        <div
          className={cn(
            "pointer-events-none relative flex justify-center px-4 pb-4",
            expanded ? "pt-4" : "pt-5",
          )}
          style={
            expanded
              ? undefined
              : {
                  background:
                    "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, #FFFFFF 100%)",
                }
          }
        >
          <Button
            text={expanded ? "Show less" : "View all"}
            variant="secondary"
            className="pointer-events-auto h-8 w-fit px-2.5"
            disabled={!expanded && loading && !guideMarkdown}
            onClick={() => setExpanded((current) => !current)}
          />
        </div>
      </div>
    </div>
  );
}
