import {
  DynamicTooltipWrapper,
  SimpleTooltipContent,
  Tag,
  useCopyToClipboard,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { toast } from "sonner";

export function DiscountCodeBadge({
  code,
  showTooltip,
}: {
  code: string;
  showTooltip?: boolean;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  return (
    <DynamicTooltipWrapper
      tooltipProps={
        showTooltip
          ? {
              content: (
                <SimpleTooltipContent
                  title="This program supports discount code tracking. Copy the code to use it in podcasts, videos, etc."
                  cta="Learn more"
                  href="https://dub.co/help/article/dual-sided-incentives"
                />
              ),
            }
          : undefined
      }
    >
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
        <Tag className="size-3 text-green-700" strokeWidth={1.5} />
        <div className="text-xs font-medium text-green-700 decoration-dotted underline-offset-2 transition-colors group-hover/discountcode:underline">
          {code}
        </div>
      </button>
    </DynamicTooltipWrapper>
  );
}
