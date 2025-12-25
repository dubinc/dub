import { Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";

export function DubPartnersLogo({ className }: { className?: string }) {
  return (
    <a
      href="https://dub.co/partners"
      target="_blank"
      className={cn("flex flex-col items-center", className)}
    >
      <Wordmark className="h-8" />
      <span className="text-sm font-medium text-neutral-700">Partners</span>
    </a>
  );
}
