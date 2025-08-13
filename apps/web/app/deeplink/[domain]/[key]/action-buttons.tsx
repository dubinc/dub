"use client";

import { EdgeLinkProps } from "@/lib/planetscale";
import { Button, Check2, Copy, Wordmark } from "@dub/ui";
import Link from "next/link";
import { useState } from "react";

export function DeepLinkActionButtons({ link }: { link: EdgeLinkProps }) {
  const [copied, setCopied] = useState(false);

  const handleClick = async ({ withCopy }: { withCopy?: boolean } = {}) => {
    if (withCopy) {
      try {
        await navigator.clipboard.writeText(link.shortLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
    window.location.href = link.ios || link.url;
  };

  return (
    <div className="flex flex-col items-center gap-4 pt-8">
      <Link
        href="https://dub.co"
        target="_blank"
        className="flex items-center gap-1.5 whitespace-nowrap text-sm"
      >
        Powered by <Wordmark className="h-4 p-0.5" />
      </Link>

      <Button
        text="Get the App"
        className="h-11 w-full rounded-xl"
        variant="primary"
        onClick={() => handleClick({ withCopy: true })}
        icon={
          copied ? <Check2 className="size-4" /> : <Copy className="size-4" />
        }
      />

      <button
        onClick={() => handleClick()}
        className="text-sm text-neutral-400"
      >
        Get the app without copying
      </button>
    </div>
  );
}
