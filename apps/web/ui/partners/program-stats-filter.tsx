import { Icon } from "@dub/ui";
import { cn, currencyFormatter, nFormatter } from "@dub/utils";
import Link from "next/link";

export function ProgramStatsFilter({
  label,
  href,
  count,
  amount,
  earnings,
  icon: Icon,
  iconClassName,
  error,
}: {
  label: string;
  href: string;
  count?: number;
  amount?: number;
  earnings?: number;
  icon: Icon;
  iconClassName?: string;
  error: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 p-3 transition-colors duration-75 hover:bg-neutral-50 active:bg-neutral-100"
    >
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

      <div>
        {count !== undefined || error ? (
          <div className="flex flex-col">
            {error ? (
              "-"
            ) : (
              <>
                <span className="text-base font-semibold leading-tight text-neutral-600">
                  {nFormatter(count, { full: true })}
                </span>

                {amount !== undefined && (
                  <span className="text-xs text-neutral-500">
                    {currencyFormatter(amount / 100)}
                  </span>
                )}

                {earnings !== undefined && (
                  <span className="text-xs text-neutral-500">
                    {currencyFormatter(earnings / 100)}
                  </span>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="h-14 w-full animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </Link>
  );
}
