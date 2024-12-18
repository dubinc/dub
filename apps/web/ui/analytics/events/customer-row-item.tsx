import { generateRandomName } from "@/lib/names";
import { Customer } from "@/lib/types";
import { useCustomerDetailsSheet } from "@/ui/partners/customer-details-sheet";
import { ChartActivity2 } from "@dub/ui";

export function CustomerRowItem({ customer }: { customer: Customer }) {
  const { customerDetailsSheet, setIsOpen: setShowCustomerDetailsSheet } =
    useCustomerDetailsSheet({
      customer,
    });

  const display = customer.name || customer.email || generateRandomName();

  return (
    <>
      {customerDetailsSheet}
      <button
        className="flex w-full items-center justify-between transition-colors hover:bg-stone-100"
        onClick={() => setShowCustomerDetailsSheet(true)}
      >
        <div className="flex items-center gap-3" title={display}>
          <img
            alt={display}
            src={customer.avatar || ""}
            className="size-4 shrink-0 rounded-full border border-neutral-200"
          />
          <span className="truncate">{display}</span>
        </div>
        <ChartActivity2 className="size-3.5" />
      </button>
    </>
  );
}
