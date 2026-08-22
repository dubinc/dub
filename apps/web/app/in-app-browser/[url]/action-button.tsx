"use client";

import { DeepViewData } from "@/lib/zod/schemas/deep-links";
import { Button, useCopyToClipboard } from "@dub/ui";
import { useState } from "react";
import { toast } from "sonner";

export function InAppBrowserActionButton({
  label,
  copyLabel,
  copiedLabel,
  copyFailedLabel,
  copyUrl,
  intentFallbackUrl,
  extBrowserScheme,
  buttonStyle,
}: {
  label: string;
  copyLabel: string;
  copiedLabel: string;
  copyFailedLabel: string;
  copyUrl: string;
  intentFallbackUrl: string;
  extBrowserScheme: string | null;
  buttonStyle?: DeepViewData["buttonStyle"];
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const [showUrlFallback, setShowUrlFallback] = useState(false);
  const canEscape = Boolean(extBrowserScheme);
  const hasCustomBackground = Boolean(buttonStyle?.backgroundColor);

  const handleOpen = () => {
    if (!extBrowserScheme) {
      return;
    }

    if (extBrowserScheme.startsWith("intent://")) {
      const onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          clearTimeout(timer);
          document.removeEventListener("visibilitychange", onVisibilityChange);
        }
      };
      const timer = window.setTimeout(() => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        window.location.href = intentFallbackUrl;
      }, 1500);
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.location.href = extBrowserScheme;
      return;
    }

    window.location.href = extBrowserScheme;
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(copyUrl, { throwOnError: true });
    } catch {
      toast.error(copyFailedLabel);
      setShowUrlFallback(true);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {canEscape ? (
        <Button
          text={label}
          className={
            hasCustomBackground
              ? "h-12 w-full font-medium text-neutral-900"
              : "h-12 w-full font-medium text-white"
          }
          onClick={handleOpen}
          {...(buttonStyle && {
            style: {
              backgroundColor: buttonStyle.backgroundColor,
              borderRadius: buttonStyle.borderRadius,
              borderColor: buttonStyle.borderColor,
            },
          })}
        />
      ) : null}
      <Button
        text={copied ? copiedLabel : copyLabel}
        variant={canEscape ? "secondary" : "default"}
        className="h-12 w-full font-medium"
        onClick={handleCopy}
      />
      {showUrlFallback && (
        <p className="select-all break-all text-center text-sm text-neutral-500">
          {copyUrl}
        </p>
      )}
    </div>
  );
}
