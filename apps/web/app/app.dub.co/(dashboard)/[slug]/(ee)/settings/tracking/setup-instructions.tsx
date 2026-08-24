"use client";

import { GuideActionButton } from "@/ui/guides/guide-action-button";
import {
  guides,
  IntegrationGuide,
  stackItems,
} from "@/ui/guides/integrations";
import { GuidesMarkdown } from "@/ui/guides/markdown";
import { Button, CircleDotted } from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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

function extractFirstCodeBlock(markdown: string) {
  const match = markdown.match(/```(\w+)?\n([\s\S]*?)```/);
  if (!match) {
    return null;
  }

  return {
    language: match[1] ?? "text",
    code: match[2].trim(),
  };
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
    <div className="mt-4 flex flex-col gap-2">
      <h4 className="text-content-emphasis text-sm font-semibold">
        Read developer guides
      </h4>
      <div className="flex flex-col">
        {DEVELOPER_GUIDES.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-default flex items-center justify-between gap-2 rounded-lg py-2 text-sm font-medium transition-colors duration-150 hover:bg-neutral-50"
          >
            {guide.title}
            <ArrowUpRight className="size-3.5 shrink-0 text-neutral-400" />
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
        <CircleDotted className="size-8 text-neutral-300" />
        <p className="text-content-subtle mt-3 max-w-sm text-sm font-medium">
          Select your stack, add at least one hostname to generate install
          instructions
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
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
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon className="size-5 shrink-0" />
                  <span className="text-sm font-medium text-neutral-800">
                    {item.title}
                  </span>
                </div>
                <Button
                  text="Read install guide"
                  variant="secondary"
                  className="h-8 w-fit px-2.5"
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

  const snippet = useMemo(
    () => (guideMarkdown ? extractFirstCodeBlock(guideMarkdown) : null),
    [guideMarkdown],
  );

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <h4 className="text-content-emphasis text-sm font-semibold">
          Main prompt
        </h4>
        {guideMarkdown && (
          <GuideActionButton guide={guide} markdown={guideMarkdown} />
        )}
      </div>

      <div className="rounded-t-xl border-t border-neutral-200 bg-white p-4">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
            <div className="h-4 w-full animate-pulse rounded bg-neutral-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-100" />
          </div>
        ) : expanded && guideMarkdown ? (
          <GuidesMarkdown>{guideMarkdown}</GuidesMarkdown>
        ) : snippet ? (
          <pre
            className={cn(
              "overflow-x-auto font-mono text-[13px] leading-6 text-neutral-800",
            )}
          >
            <code>{snippet.code}</code>
          </pre>
        ) : (
          <p className="text-content-subtle text-sm">
            Failed to load install instructions.
          </p>
        )}

        {guideMarkdown && (
          <Button
            text={expanded ? "Show less" : "View all"}
            variant="secondary"
            className="mt-4 h-8 w-fit px-2.5"
            onClick={() => setExpanded((current) => !current)}
          />
        )}
      </div>
    </div>
  );
}
