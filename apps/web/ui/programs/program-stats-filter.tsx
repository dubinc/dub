import { Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";

export function ProgramStatsFilter({
  label,
  href,
  count,
  icon: Icon,
  iconClassName,
  error,
}: {
  label: string;
  href: string;
  count: number | undefined;
  icon: Icon;
  iconClassName?: string;
  error: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-3 text-left transition-colors duration-75 hover:bg-gray-50 active:bg-gray-100"
    >
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
            {error ? "-" : count}
          </div>
        ) : (
          <div className="h-5 w-10 min-w-0 animate-pulse rounded-md bg-neutral-200" />
        )}
      </div>
    </Link>
  );
}
