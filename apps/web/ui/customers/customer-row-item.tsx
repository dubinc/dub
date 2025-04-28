import { generateRandomName } from "@/lib/names";
import { ChartActivity2 } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";

export function CustomerRowItem({
  customer,
  href,
  className,
}: {
  customer: {
    id: string;
    email?: string | null;
    name?: string | null;
    avatar?: string | null;
  };
  href: string;
  className?: string;
}) {
  const display = customer.email || customer.name || generateRandomName();

  return (
    <Link
      href={href}
      target="_blank"
      className={cn(
        "group flex cursor-alias items-center justify-between gap-2 decoration-dotted hover:underline",
        className,
      )}
    >
      <div className="flex items-center gap-3 truncate" title={display}>
        <img
          alt={display}
          src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
          className="size-4 shrink-0 rounded-full border border-neutral-200"
        />
        <span className="truncate">{display}</span>
      </div>
      <ChartActivity2 className="size-3.5 shrink-0 transition-all group-hover:-translate-x-3 group-hover:opacity-0" />
    </Link>
  );
}
