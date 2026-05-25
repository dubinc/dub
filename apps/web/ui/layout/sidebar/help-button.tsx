import { CircleQuestion } from "@dub/ui";
import { cn } from "@dub/utils";

export async function HelpButton({
  variant = "default",
}: {
  variant?: "default" | "secondary";
}) {
  return (
    <a
      href="https://dub.co/contact/support"
      target="_blank"
      className={cn(
        "shrink-0 items-center justify-center rounded-lg",
        variant === "secondary"
          ? "flex h-8 w-8 border border-neutral-200 bg-white text-neutral-700 shadow-sm transition-colors hover:bg-neutral-100"
          : "text-content-default hover:bg-bg-inverted/5 flex size-11",
      )}
    >
      <CircleQuestion className="size-5" strokeWidth={2} />
    </a>
  );
}
