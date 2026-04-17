import { cn } from "@dub/utils";
import { X } from "lucide-react";

export function ModalCloseButton({
  onClick,
  className,
  ariaLabel = "Close",
}: {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "group rounded-full p-2 text-neutral-500",
        "transition-all duration-75",
        "hover:bg-neutral-100 focus:outline-none active:bg-neutral-200",
        className,
      )}
    >
      <X className="size-5" aria-hidden="true" />
    </button>
  );
}
