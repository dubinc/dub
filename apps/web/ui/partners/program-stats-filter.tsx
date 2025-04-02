import { Icon } from "@dub/ui";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import Link from "next/link";

export function ProgramStatsFilter({
  label,
  href,
  count,
  amount,
  icon: Icon,
  iconClassName,
  variant = "compact",
  error,
}: {
  label: string;
  href: string;
  count?: number;
  amount?: number;
  icon: Icon;
  iconClassName?: string;
  variant?: "compact" | "loose";
  error: boolean;
}) {
  return (
    <Link href={href}>
      {variant === "compact" ? (
        <div className="flex items-center gap-4 p-3 text-left transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-md",
              iconClassName,
            )}
          >
            <Icon className="size-4.5" />
          </div>
          <div>
            <div className="text-xs text-neutral-500">{label}</div>
            {count !== undefined || error ? (
              <div className="text-base font-medium leading-tight text-neutral-800">
                {error ? "-" : nFormatter(count, { full: true })}
              </div>
            ) : (
              <div className="h-5 w-10 min-w-0 animate-pulse rounded-md bg-neutral-200" />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-3 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center gap-2 rounded-md",
                iconClassName,
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="text-xs text-neutral-500">{label}</div>
          </div>

          <div className="flex flex-col gap-0.5">
            {count !== undefined || error ? (
              error ? (
                "-"
              ) : (
                <>
                  <span className="text-base font-semibold leading-tight text-neutral-600">
                    {nFormatter(count, { full: true })}
                  </span>
                  <span className="text-xs font-medium text-neutral-500">
                    {amount !== undefined && currencyFormatter(amount / 100)}
                  </span>
                </>
              )
            ) : (
              <>
                <div className="h-5 w-16 animate-pulse rounded-md bg-neutral-200" />
                <div className="mt-1 h-3 w-24 animate-pulse rounded-md bg-neutral-200" />
              </>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
