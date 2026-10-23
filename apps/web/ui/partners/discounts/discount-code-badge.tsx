import { Tag, Tooltip, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function DiscountCodeBadge({
  code,
  disabledAt,
  disabledTooltip = "This discount code was disabled because the partner was banned or deactivated. To re-enable it, delete this code and create a new one.",
}: {
  code: string;
  disabledAt?: Date | string | null;
  disabledTooltip?: string;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const isDisabled = !!disabledAt;

  // Only show the full code in a tooltip when it's actually truncated
  const codeRef = useRef<HTMLDivElement>(null);
  const [isClipped, setIsClipped] = useState(false);
  const measureClipped = () => {
    const el = codeRef.current;
    setIsClipped(!!el && el.scrollWidth > el.clientWidth);
  };

  const content = (
    <>
      <Tag
        className={cn(
          "size-3 shrink-0",
          isDisabled ? "text-neutral-500" : "text-green-700",
        )}
        strokeWidth={1.5}
      />
      <div
        ref={codeRef}
        className={cn(
          "min-w-0 truncate text-xs font-medium",
          isDisabled
            ? "text-neutral-500 line-through"
            : "text-green-700 decoration-dotted underline-offset-2 transition-colors group-hover/discountcode:underline",
        )}
      >
        {code}
      </div>
    </>
  );

  if (isDisabled) {
    return (
      <Tooltip
        content={
          isClipped ? `\`${code}\`\n\n${disabledTooltip}` : disabledTooltip
        }
      >
        <div
          className="flex w-fit max-w-full cursor-help items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1"
          onPointerEnter={measureClipped}
          onFocus={measureClipped}
        >
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      disabled={!isClipped}
      content={
        <div className="max-w-xs break-all px-3 py-2 text-sm text-neutral-600">
          {code}
        </div>
      }
    >
      <button
        type="button"
        className={cn(
          "group/discountcode relative flex w-fit max-w-full cursor-copy items-center gap-1 rounded-lg bg-green-200 px-2 py-1",
          "transition-colors duration-150 hover:bg-green-300/80",
          copied && "cursor-default",
        )}
        onPointerEnter={measureClipped}
        onFocus={measureClipped}
        onClick={() =>
          copyToClipboard(code, {
            onSuccess: () => {
              toast.success("Copied discount code to clipboard");
            },
          })
        }
      >
        {content}
      </button>
    </Tooltip>
  );
}
