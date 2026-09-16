import { Tooltip, useCopyToClipboard } from "@dub/ui";
import { DiscountCode } from "@dub/ui/icons";
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
      <DiscountCode
        className={cn(
          "size-3",
          isDisabled ? "text-neutral-500" : "text-green-700",
        )}
      />
      <div
        className={cn(
          "text-xs font-semibold leading-4",
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
        <div className="flex h-5 w-fit cursor-help items-center gap-1 rounded-lg bg-neutral-100 px-1.5 py-0.5">
          {content}
        </div>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "group/discountcode relative flex h-5 w-fit cursor-copy items-center gap-1 rounded-lg bg-green-200 px-1.5 py-0.5",
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
