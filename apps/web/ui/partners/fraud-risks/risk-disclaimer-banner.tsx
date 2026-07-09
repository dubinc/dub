import { TriangleWarning } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export function RiskDisclaimerBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5",
        className,
      )}
    >
      <TriangleWarning className="mt-0.5 size-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-sm text-amber-900">
        We recommend reviewing the risk events thoroughly before taking action.
        Unresolved events expire after 30 days.{" "}
        <a
          href="https://dub.co/help/article/risk-monitoring"
          target="_blank"
          className="font-medium underline underline-offset-2 transition-colors hover:text-neutral-800"
        >
          Learn more
        </a>
        .
      </p>
    </div>
  );
}
