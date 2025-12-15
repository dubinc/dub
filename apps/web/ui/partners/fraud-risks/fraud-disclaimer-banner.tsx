import { TriangleWarning } from "@dub/ui/icons";
import { cn } from "@dub/utils";

export function FraudDisclaimerBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2.5",
        className,
      )}
    >
      <TriangleWarning className="mt-0.5 size-4 shrink-0 text-yellow-500" />
      <p className="flex-1 text-sm text-neutral-700">
        We recommend reviewing the flagged events thoroughly and potentially
        reaching out to the partner before making a final decision.{" "}
        <a
          href="https://dub.co/help/article/fraud-detection"
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
