import { usePartnerRewindStatus } from "@/ui/partners/rewind/use-partner-rewind-status";
import { Button, ChevronLeft, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { useEffect } from "react";
import { navButtonClassName } from "./rewind";

export function Conclusion({
  onRestart,
  onClose,
}: {
  onRestart: () => void;
  onClose: () => void;
}) {
  const { status, setStatus } = usePartnerRewindStatus();

  // Set status to card (shows in sidebar) after the user has finished the rewind
  useEffect(() => {
    if (status !== "card") setStatus("card");
  }, [status]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className={cn("flex flex-col items-center gap-2")}>
        <Wordmark
          className={cn(
            "h-12",
            "animate-slide-up-fade [--offset:10px] [animation-duration:1.5s]",
          )}
        />
        <h2
          className={cn(
            "text-content-emphasis text-2xl font-bold",
            "animate-slide-up-fade [--offset:10px] [animation-delay:0.2s] [animation-duration:1.5s] [animation-fill-mode:both]",
          )}
        >
          Partner Rewind &rsquo;25
        </h2>
      </div>
      <p
        className={cn(
          "text-content-default max-w-[480px] text-pretty text-xl font-medium",
          "animate-slide-up-fade [--offset:10px] [animation-delay:0.3s] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        Thank you for all your hard work being a Dub Partner. We can&rsquo;t
        wait to see what you&rsquo;ll do in 2026!
      </p>
      <div className="animate-slide-up-fade flex items-center gap-2 [--offset:10px] [animation-delay:0.4s] [animation-duration:1s] [animation-fill-mode:both]">
        <button
          type="button"
          onClick={onRestart}
          className={navButtonClassName}
        >
          <ChevronLeft className="size-3 [&_*]:stroke-2" />
        </button>
        <Button
          text="Close"
          className="h-8 w-fit rounded-lg px-4"
          onClick={onClose}
        />
      </div>
    </div>
  );
}
