import { Button, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";

export function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div
        className={cn(
          "flex flex-col items-center gap-2",
          "animate-partner-rewind-intro",
        )}
      >
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
          "text-content-default max-w-[420px] text-pretty text-xl font-medium",
          "animate-slide-up-fade [--offset:10px] [animation-delay:1.9s] [animation-duration:1s] [animation-fill-mode:both]",
        )}
      >
        This was a huge year for partners. Let&rsquo;s rewind to have a look at
        your 2025 impact.
      </p>
      <div className="animate-slide-up-fade [--offset:10px] [animation-delay:2s] [animation-duration:1s] [animation-fill-mode:both]">
        <Button
          text="Rewind the year"
          className="h-9 w-fit rounded-lg px-4"
          onClick={onStart}
        />
      </div>
    </div>
  );
}
