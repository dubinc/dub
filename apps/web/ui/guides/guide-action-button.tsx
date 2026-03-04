import {
  Anthropic,
  BookOpen,
  Button,
  Check,
  Codex,
  Cursor,
  OpenAI,
  Popover,
  useCopyToClipboard,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowUpRight, ChevronDown, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { IntegrationGuide } from "./integrations";

const CONVERSION_TRACKING_PATTERNS = [
  /data-publishable-key=/,
  /publishableKey=/,
  /s\.setAttribute\("data-publishable-key"/,
];

const PUBLISHABLE_KEY_PLACEHOLDER = "<YOUR_DUB_PUBLISHABLE_KEY>";
const OUTBOUND_DOMAIN_PLACEHOLDER = '["<YOUR_DOMAIN_1>", "<YOUR_DOMAIN_2>"]';
const REFER_DOMAIN_PLACEHOLDER = "<YOUR_REFERRING_DOMAIN>";

function getGuideOptionName(guide: IntegrationGuide) {
  return guide.description || [guide.title, guide.subtitle].filter(Boolean).join(" ");
}

function sanitizeClientScriptMarkdown(markdown: string) {
  return markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/dub_pk_[A-Za-z0-9_-]+/g, PUBLISHABLE_KEY_PLACEHOLDER)
    .replace(
      /data-publishable-key="[^"]*"/g,
      `data-publishable-key="${PUBLISHABLE_KEY_PLACEHOLDER}"`,
    )
    .replace(
      /publishableKey="[^"]*"/g,
      `publishableKey="${PUBLISHABLE_KEY_PLACEHOLDER}"`,
    )
    .replace(
      /s\.setAttribute\("data-publishable-key", "[^"]*"\);/g,
      `s.setAttribute("data-publishable-key", "${PUBLISHABLE_KEY_PLACEHOLDER}");`,
    )
    .replace(
      /"outbound": \["example\.com", "example\.sh"\]/g,
      `"outbound": ${OUTBOUND_DOMAIN_PLACEHOLDER}`,
    )
    .replace(
      /outbound: \["example\.com", "example\.sh"\]/g,
      `outbound: ${OUTBOUND_DOMAIN_PLACEHOLDER}`,
    )
    .replace(
      /"refer":\s*"[^"]*"/g,
      `"refer": "${REFER_DOMAIN_PLACEHOLDER}"`,
    )
    .replace(
      /refer:\s*"[^"]*"/g,
      `refer: "${REFER_DOMAIN_PLACEHOLDER}"`,
    )
    .trim();
}

function sanitizeGuideInstructions(markdown: string) {
  return markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function isOutboundDomainTrackingEnabled(markdown: string) {
  return (
    /script\.[^"'\s]*outbound-domains[^"'\s]*\.js/.test(markdown) ||
    /"outbound"\s*:/.test(markdown) ||
    /\boutbound\s*:/.test(markdown)
  );
}

function getReactStepOnePrompt(markdown: string, guide: IntegrationGuide) {
  const conversionTrackingEnabled = CONVERSION_TRACKING_PATTERNS.some((pattern) =>
    pattern.test(markdown),
  );
  const outboundTrackingEnabled = isOutboundDomainTrackingEnabled(markdown);

  const analyticsProps = [
    conversionTrackingEnabled
      ? `        publishableKey="${PUBLISHABLE_KEY_PLACEHOLDER}"`
      : null,
    outboundTrackingEnabled
      ? `        domainsConfig={{\n          refer: "${REFER_DOMAIN_PLACEHOLDER}",\n          outbound: ${OUTBOUND_DOMAIN_PLACEHOLDER}\n        }}`
      : null,
  ].filter(Boolean);

  const analyticsComponent =
    analyticsProps.length > 0
      ? `<DubAnalytics\n${analyticsProps.join("\n")}\n      />`
      : "<DubAnalytics />";

  return [
    "I'm using Dub and need to install the client-side script. Help me add the script from the instructions below.",
    conversionTrackingEnabled
      ? "Ask me for my publishable key before finalizing the conversion tracking setup."
      : null,
    "Ask me if I want to enable client-side click tracking (Dub Partners). If yes, add `domainsConfig={{ refer: \"<YOUR_REFERRING_DOMAIN>\" }}`.",
    outboundTrackingEnabled
      ? "Ask me which outbound domains I want to track before finalizing the setup."
      : null,
    "Step 1: Install Dub package to your project",
    "```bash\nnpm install @dub/analytics\n```",
    "Step 2: Initialize package in your code",
    `\`\`\`jsx
import { Analytics as DubAnalytics } from '@dub/analytics/react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
      ${analyticsComponent}
    </html>
  );
}
\`\`\``,
    `Full guide link for reference: ${guide.url}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function getGuidePrompt(guide: IntegrationGuide, markdown: string) {
  if (guide.type === "client-sdk" && guide.key === "shopify") {
    return `Read from ${guide.url} so I can ask questions about it.`;
  }

  if (guide.type === "client-sdk" && guide.key === "react") {
    return getReactStepOnePrompt(markdown, guide);
  }

  if (guide.type === "client-sdk") {
    const conversionTrackingEnabled = CONVERSION_TRACKING_PATTERNS.some((pattern) =>
      pattern.test(markdown),
    );
    const outboundTrackingEnabled = isOutboundDomainTrackingEnabled(markdown);
    const sanitizedMarkdown = sanitizeClientScriptMarkdown(markdown);

    return [
      "I'm using Dub and need to install the client-side script.",
      "Help me add the script from the instructions below.",
      conversionTrackingEnabled
        ? "Ask me for my publishable key before finalizing the conversion tracking setup."
        : null,
      "Ask me if I want to enable client-side click tracking (Dub Partners). If yes, add `domainsConfig.refer` with my referring domain.",
      outboundTrackingEnabled
        ? "Ask me which outbound domains I want to track before finalizing the setup."
        : null,
      "Instructions:",
      sanitizedMarkdown,
      `Full guide link for reference: ${guide.url}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  const optionName = getGuideOptionName(guide);
  const intro =
    guide.type === "track-lead"
      ? `I'm using Dub and need to track lead events with ${optionName}. Help set that up with these instructions.`
      : `I'm using Dub and need to track sale events with ${optionName}. Help set that up with these instructions.`;

  return [
    intro,
    "Instructions:",
    sanitizeGuideInstructions(markdown),
    `Full guide link for reference: ${guide.url}`,
  ].join("\n\n");
}

export const GuideActionButton = ({
  guide,
  markdown,
}: {
  guide: IntegrationGuide;
  markdown: string;
}) => {
  const [openDropdown, setOpenDropdown] = useState(false);

  const [copied, copyToClipboard] = useCopyToClipboard();

  const prompt = getGuidePrompt(guide, markdown);
  const cursorUrl = `https://cursor.com/link/prompt?text=${encodeURIComponent(prompt)}`;
  const codexUrl = `https://chatgpt.com/codex?prompt=${encodeURIComponent(prompt)}`;

  return (
    <div className="border-border-subtle flex h-8 items-center overflow-hidden rounded-lg border">
      <Link href={guide.url} target="_blank" rel="noopener noreferrer">
        <Button
          text="Read full guide"
          variant="secondary"
          className="rounded-none border-0 px-3"
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
                  Copy section as Markdown for LLMs
                </span>
              </div>
            </button>

            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
              onClick={() => {
                const chatgptUrl = `https://chatgpt.com?hints=search&prompt=${encodeURIComponent(prompt)}`;
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

            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
              onClick={() => {
                window.open(cursorUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-200 transition-colors hover:border-neutral-300">
                <Cursor className="size-4 text-neutral-600" />
              </div>
              <div className="flex flex-1 flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Open in Cursor</span>
                  <ArrowUpRight className="size-3.5 text-neutral-600" />
                </div>
                <span className="text-xs text-neutral-500">
                  Preview prompt and open in Cursor
                </span>
              </div>
            </button>

            <button
              className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100"
              onClick={() => {
                window.open(codexUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded border border-neutral-200 transition-colors hover:border-neutral-300">
                <Codex className="size-4 text-neutral-600" />
              </div>
              <div className="flex flex-1 flex-col items-start">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Open in Codex</span>
                  <ArrowUpRight className="size-3.5 text-neutral-600" />
                </div>
                <span className="text-xs text-neutral-500">
                  Open the prompt in Codex
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
  );
};
