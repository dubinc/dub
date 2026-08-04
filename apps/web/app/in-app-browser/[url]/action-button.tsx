"use client";

import { DeepViewData } from "@/lib/zod/schemas/deep-links";
import { Button, useCopyToClipboard } from "@dub/ui";

export function InAppBrowserActionButton({
  label,
  copyLabel,
  copiedLabel,
  copyUrl,
  destinationUrl,
  extBrowserScheme,
  buttonStyle,
}: {
  label: string;
  copyLabel: string;
  copiedLabel: string;
  copyUrl: string;
  destinationUrl: string;
  extBrowserScheme: string | null;
  buttonStyle?: DeepViewData["buttonStyle"];
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const handleOpen = () => {
    if (extBrowserScheme) {
      window.location.href = extBrowserScheme;
      return;
    }

    window.location.href = destinationUrl;
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        text={label}
        className="h-12 w-full font-medium text-white"
        onClick={handleOpen}
        {...(buttonStyle && {
          style: {
            backgroundColor: buttonStyle.backgroundColor,
            borderRadius: buttonStyle.borderRadius,
            borderColor: buttonStyle.borderColor,
          },
        })}
      />
      <Button
        text={copied ? copiedLabel : copyLabel}
        variant="secondary"
        className="h-12 w-full font-medium"
        onClick={() => copyToClipboard(copyUrl)}
      />
    </div>
  );
}
