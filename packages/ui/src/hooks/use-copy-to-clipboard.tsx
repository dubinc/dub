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
          await navigator.clipboard.writeText(value);
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
        console.error("Failed to copy: ", error);
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
