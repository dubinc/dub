"use client";

import { EdgeLinkProps } from "@/lib/planetscale";
import { Button, IOSAppStore } from "@dub/ui";
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
    <div className="flex flex-col items-center gap-5">
      <Button
        text="Get the App"
        className="h-12 w-full rounded-xl bg-neutral-900 text-white hover:bg-neutral-800"
        variant="primary"
        onClick={() => handleClick({ withCopy: true })}
        icon={<IOSAppStore className="size-6" />}
      />

      <button
        onClick={() => handleClick()}
        className="text-base font-medium text-neutral-700 hover:text-neutral-900"
      >
        Get the App without copying
      </button>
    </div>
  );
}
