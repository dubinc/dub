import { generateRandomName } from "@/lib/names";
import { Customer } from "@/lib/types";
import { ChartActivity2, useRouterStuff } from "@dub/ui";
import Link from "next/link";

export function CustomerRowItem({ customer }: { customer: Customer }) {
  const display = customer.name || customer.email || generateRandomName();
  const { queryParams } = useRouterStuff();

  return (
    <>
      <Link
        href={
          queryParams({
            set: {
              customerId: customer.id,
            },
            getNewPath: true,
          }) as string
        }
        scroll={false}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-stone-100"
      >
        <div className="flex items-center gap-3 truncate" title={display}>
          <img
            alt={display}
            src={customer.avatar || ""}
            className="size-4 shrink-0 rounded-full border border-neutral-200"
          />
          <span className="truncate">{display}</span>
        </div>
        <ChartActivity2 className="size-3.5 shrink-0" />
      </Link>
    </>
  );
}
