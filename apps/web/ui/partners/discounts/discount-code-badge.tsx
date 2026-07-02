import { StatusBadge, Tag, Tooltip, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";
import { toast } from "sonner";

export function DiscountCodeBadge({
  code,
  disabledAt,
}: {
  code: string;
  disabledAt?: Date | string | null;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const isDisabled = !!disabledAt;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={cn(
          "group/discountcode relative flex w-fit cursor-copy items-center gap-1 rounded-lg px-2 py-1",
          "transition-colors duration-150",
          copied && "cursor-default",
          isDisabled
            ? "bg-neutral-200/80 line-through hover:bg-neutral-200/80 hover:no-underline"
            : "bg-green-200 hover:bg-green-300/80",
        )}
        onClick={() =>
          copyToClipboard(code, {
            onSuccess: () => {
              toast.success("Copied discount code to clipboard");
            },
          })
        }
      >
        <Tag
          className={cn(
            "size-3",
            isDisabled ? "text-neutral-500" : "text-green-700",
          )}
          strokeWidth={1.5}
        />
        <div
          className={cn(
            "text-xs font-medium decoration-dotted underline-offset-2 transition-colors group-hover/discountcode:underline",
            isDisabled ? "text-neutral-600" : "text-green-700",
          )}
        >
          {code}
        </div>
      </button>
      {isDisabled && (
        <Tooltip content="This discount code was disabled because the partner was banned or deactivated. To re-enable it, delete this code and create a new one.">
          <StatusBadge
            variant="neutral"
            size="sm"
            icon={null}
            className="cursor-help"
          >
            Disabled
          </StatusBadge>
        </Tooltip>
      )}
    </div>
  );
}
