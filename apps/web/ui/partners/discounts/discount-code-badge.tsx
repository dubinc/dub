import { Tag, useCopyToClipboard } from "@dub/ui";
import { cn } from "@dub/utils";
import { toast } from "sonner";

export function DiscountCodeBadge({ code }: { code: string }) {
  const [copied, copyToClipboard] = useCopyToClipboard();
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
      <Tag className="size-3 text-green-700" strokeWidth={1.5} />
      <div className="text-xs font-medium text-green-700 decoration-dotted underline-offset-2 transition-colors group-hover/discountcode:underline">
        {code}
      </div>
    </button>
  );
}
