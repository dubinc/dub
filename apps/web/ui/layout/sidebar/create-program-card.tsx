import usePrograms from "@/lib/swr/use-programs";
import useWorkspace from "@/lib/swr/use-workspace";
import { buttonVariants, NavWordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

export function CreateProgramCard() {
  const { programs } = usePrograms();
  const { partnersEnabled, slug } = useWorkspace();

  if (!partnersEnabled || (programs && programs.length > 0)) {
    return null;
  }

  return (
    <div className="relative mt-6 flex flex-col gap-3 overflow-hidden rounded-lg border bg-white p-3 pt-4">
      <div className="relative flex items-center gap-2">
        <NavWordmark variant="symbol" className="h-4 w-4" />
      </div>

      <div className="relative flex flex-col gap-1">
        <h1 className="text-sm font-semibold text-neutral-900">Dub Partners</h1>
        <p className="text-sm text-neutral-800">
          Grow your revenue on autopilot with Dub Partners
        </p>
      </div>

      <Link
        href={`/${slug}/programs/new`}
        className={cn(
          buttonVariants({ variant: "primary" }),
          "flex h-10 items-center justify-center rounded-lg border px-3 text-sm",
        )}
      >
        Create program
      </Link>
    </div>
  );
}
