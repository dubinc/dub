import useCustomers from "@/lib/swr/use-customers";
import { CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/customers";
import { Button, Combobox } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useAddCustomerModal } from "../modals/add-customer-modal";

interface CustomerSelectorProps {
  selectedCustomerId: string;
  setSelectedCustomerId: (customerId: string) => void;
}

export function CustomerSelector({
  selectedCustomerId,
  setSelectedCustomerId,
}: CustomerSelectorProps) {
  const [search, setSearch] = useState("");
  const [useAsync, setUseAsync] = useState(false);
  const [debouncedSearch] = useDebounce(search, 500);
  const [openPopover, setOpenPopover] = useState(false);

  const { customers, loading } = useCustomers({
    query: useAsync ? { search: debouncedSearch } : undefined,
  });

  const { customers: selectedCustomers, loading: selectedCustomersLoading } =
    useCustomers({
      query: selectedCustomerId
        ? { customerIds: [selectedCustomerId] }
        : undefined,
    });

  useEffect(() => {
    if (customers && !useAsync && customers.length >= CUSTOMERS_MAX_PAGE_SIZE) {
      setUseAsync(true);
    }
  }, [customers, useAsync]);

  const { AddCustomerModal, setShowAddCustomerModal } = useAddCustomerModal({
    onSuccess: (customer) => {
      setSelectedCustomerId(customer.id);
    },
  });

  const customerOptions = useMemo(() => {
    return customers?.map((customer) => ({
      value: customer.id,
      label: customer.name || customer.email || customer.externalId,
      icon: (
        <img
          src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [customers]);

  const selectedOption = useMemo(() => {
    if (!selectedCustomerId) return null;

    const customer = [...(customers || []), ...(selectedCustomers || [])].find(
      (c) => c.id === selectedCustomerId,
    );

    if (!customer) return null;

    return {
      value: customer.id,
      label: customer.name || customer.email || customer.externalId,
      icon: (
        <img
          src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
          className="size-4 rounded-full"
        />
      ),
    };
  }, [customers, selectedCustomers, selectedCustomerId]);

  return (
    <>
      <AddCustomerModal />
      <Combobox
        options={loading ? undefined : customerOptions}
        setSelected={(option) => {
          setSelectedCustomerId(option.value);
        }}
        selected={selectedOption}
        icon={selectedCustomersLoading ? null : selectedOption?.icon}
        caret={true}
        placeholder={selectedCustomersLoading ? "" : "Select customer"}
        searchPlaceholder="Search customer..."
        onSearchChange={setSearch}
        shouldFilter={!useAsync}
        matchTriggerWidth
        open={openPopover}
        onOpenChange={setOpenPopover}
        buttonProps={{
          className: cn(
            "w-full justify-start border-neutral-300 px-3",
            "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
            "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
          ),
        }}
        emptyState={
          <div className="flex w-full flex-col items-center gap-2 py-4">
            No customers found
            <Button
              onClick={() => {
                setOpenPopover(false);
                setShowAddCustomerModal(true);
              }}
              variant="primary"
              className="h-7 w-fit px-2"
              text="Create customer"
            />
          </div>
        }
      >
        {selectedCustomersLoading ? (
          <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
        ) : (
          selectedOption?.label
        )}
      </Combobox>
    </>
  );
}
