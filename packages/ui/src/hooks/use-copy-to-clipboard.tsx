import { useCallback, useEffect, useRef, useState } from "react";

export const useCopyToClipboard = (
  timeout: number = 3000,
): [
  boolean,
  (
    value: string | ClipboardItem,
    options?: { onSuccess?: () => void },
  ) => Promise<void>,
] => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const copyToClipboard = useCallback(
    async (
      value: string | ClipboardItem,
      { onSuccess }: { onSuccess?: () => void } = {},
    ) => {
      clearTimer();
      try {
        if (typeof value === "string") {
          // Try modern clipboard API first
          try {
            await navigator.clipboard.writeText(value);
          } catch (err) {
            console.log("Modern clipboard API failed, trying fallback method:", err);
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement("textarea");
            textArea.value = value;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            
            try {
              // Focus and select the text
              textArea.focus();
              textArea.select();
              
              // Try to copy using the older execCommand method
              const successful = document.execCommand("copy");
              if (!successful) {
                throw new Error("execCommand('copy') failed");
              }
            } finally {
              // Always clean up
              document.body.removeChild(textArea);
            }
          }
        } else if (value instanceof ClipboardItem) {
          await navigator.clipboard.write([value]);
        }
        setCopied(true);
        onSuccess?.();

        // Ensure timeout is a non-negative finite number
        if (Number.isFinite(timeout) && timeout >= 0) {
          timer.current = setTimeout(() => setCopied(false), timeout);
        }
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        throw error; // Re-throw the error so the caller can handle it
      }
    },
    [timeout],
  );

  // Cleanup the timer when the component unmounts
  useEffect(() => {
    return () => clearTimer();
  }, []);

  return [copied, copyToClipboard];
};
