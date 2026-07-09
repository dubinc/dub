import { Tag, Tooltip, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";
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

  const content = (
    <>
      <Tag
        className={cn(
          "size-3",
          isDisabled ? "text-neutral-500" : "text-green-700",
        )}
        strokeWidth={1.5}
      />
      <div
        className={cn(
          "text-xs font-medium",
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
      <Tooltip content={disabledTooltip}>
        <div className="flex w-fit cursor-help items-center gap-1 rounded-lg bg-neutral-100 px-2 py-1">
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "group/discountcode relative flex w-fit cursor-copy items-center gap-1 rounded-lg bg-green-200 px-2 py-1",
        "transition-colors duration-150 hover:bg-green-300/80",
        copied && "cursor-default",
      )}
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
  );
}
