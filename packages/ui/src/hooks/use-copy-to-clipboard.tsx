import { useCallback, useRef, useState } from "react";

const useCopyToClipboard = (
  timeout: number = 3000,
): [boolean, (value: string | ClipboardItem) => Promise<void>] => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const setTimer = (callback: () => void, timeout: number) => {
    timer.current = setTimeout(() => {
      callback();
      timer.current && clearTimeout(timer.current);
      timer.current = null;
    }, timeout);
  };

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const copyToClipboard = useCallback(
    (value: string | ClipboardItem) => {
      const handleCopy = async () => {
        if (typeof value === "string") {
          await navigator.clipboard.writeText(value);
        } else if (value instanceof ClipboardItem) {
          await navigator.clipboard.write([value]);
        }
        setCopied(true);
        setTimer(() => setCopied(false), timeout);
      };
      clearTimer();
      return handleCopy();
    },
    [timeout],
  );

  return [copied, copyToClipboard];
};

export default useCopyToClipboard;
