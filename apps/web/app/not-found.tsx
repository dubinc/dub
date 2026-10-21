import { AuroraGradient } from "@/ui/shared/aurora-gradient";
import { Grid, Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { NotFoundHint } from "./not-found-hint";

export default function NotFound() {
  return (
    <>
      <div className="absolute inset-0 isolate overflow-hidden bg-white">
        <div
          className={cn(
            "absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2",
            "[mask-composite:intersect] [mask-image:linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]",
          )}
        >
          <Grid
            cellSize={60}
            patternOffset={[0.75, 0]}
            className="text-neutral-200"
          />
        </div>
        <AuroraGradient />
      </div>

      <div className="relative flex h-screen w-screen flex-col items-center justify-center gap-6">
        <Link href="/" className="absolute left-4 top-3">
          <Wordmark className="h-6" />
        </Link>
        <NotFoundHint />
      </div>
    </>
  );
}
