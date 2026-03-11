import useCustomers from "@/lib/swr/use-customers";
import { CUSTOMERS_MAX_PAGE_SIZE } from "@/lib/zod/schemas/customers";
import { Combobox, ComboboxProps } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import {
  AddCustomerModal,
  type AddCustomerInitialData,
} from "../modals/add-customer-modal";

type CustomerSelectorProps = {
  selectedCustomerId: string | null;
  setSelectedCustomerId: (customerId: string) => void;
  disabled?: boolean;
  variant?: "default" | "header";
} & Partial<ComboboxProps<false, any>>;

export function CustomerSelector({
  selectedCustomerId,
  setSelectedCustomerId,
  disabled,
  variant = "default",
  ...rest
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

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [initialData, setInitialData] = useState<
    AddCustomerInitialData | undefined
  >();

  const customerOptions = useMemo(() => {
    return (
      customers?.map((customer) => ({
        value: customer.id,
        label: customer.name || customer.email || customer.externalId,
        icon: (
          <span className="shrink-0 text-neutral-600">
            <img
              src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
              alt=""
              className="size-4 rounded-full"
              onError={(e) => {
                // Fallback to OG avatar if image fails to load
                const target = e.target as HTMLImageElement;
                if (target.src !== `${OG_AVATAR_URL}${customer.id}`) {
                  target.src = `${OG_AVATAR_URL}${customer.id}`;
                }
              }}
            />
          </span>
        ),
      })) || []
    );
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
        <span className="shrink-0 text-neutral-600">
          <img
            src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
            alt=""
            className="size-4 rounded-full"
            onError={(e) => {
              // Fallback to OG avatar if image fails to load
              const target = e.target as HTMLImageElement;
              if (target.src !== `${OG_AVATAR_URL}${customer.id}`) {
                target.src = `${OG_AVATAR_URL}${customer.id}`;
              }
            }}
          />
        </span>
      ),
    };
  }, [customers, selectedCustomers, selectedCustomerId]);

  return (
    <>
      <AddCustomerModal
        showModal={showAddCustomerModal}
        setShowModal={setShowAddCustomerModal}
        initialData={initialData}
        onSuccess={(customer) => {
          setSelectedCustomerId(customer.id);
        }}
      />
      <Combobox
        options={loading ? undefined : customerOptions}
        setSelected={(option) => {
          if (!option) return;
          setSelectedCustomerId(option.value);
        }}
        selected={selectedOption}
        icon={
          variant === "header" && !selectedOption?.icon ? (
            <div className="size-5 flex-none animate-pulse rounded-full bg-neutral-200" />
          ) : (
            selectedOption?.icon
          )
        }
        caret={true}
        placeholder={variant === "header" ? "" : "Select customer"}
        searchPlaceholder={
          variant === "header" ? "Search customers..." : "Search or create customer..."
        }
        onSearchChange={setSearch}
        {...(variant !== "header" && {
          createLabel: (search: string) =>
            `Create ${search ? `"${search}"` : "new customer"}`,
          onCreate: async (search: string | undefined) => {
            const trimmed = search?.trim() ?? "";
            setInitialData(
              trimmed
                ? trimmed.includes("@")
                  ? { email: trimmed }
                  : { name: trimmed }
                : undefined,
            );
            setShowAddCustomerModal(true);
            return true;
          },
        })}
        shouldFilter={!useAsync}
        matchTriggerWidth
        open={openPopover}
        onOpenChange={setOpenPopover}
        {...(variant === "header"
          ? {
              popoverProps: {
                contentClassName: "min-w-[280px]",
              },
              labelProps: {
                className: "text-lg font-semibold leading-7 text-neutral-900",
              },
              iconProps: {
                className: "size-6",
              },
              buttonProps: {
                disabled,
                className:
                  "w-full justify-start px-2 py-1 h-8 transition-none max-md:bg-bg-subtle hover:bg-bg-subtle md:hover:bg-subtle border-none rounded-lg",
              },
            }
          : {
              buttonProps: {
                disabled,
                className: cn(
                  "w-full justify-start border-neutral-300 px-3",
                  "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                  "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                ),
              },
            })}
        {...rest}
      >
        {variant === "header" && !selectedOption?.label ? (
          <div className="h-6 w-[120px] animate-pulse rounded bg-neutral-100" />
        ) : selectedCustomersLoading ? (
          <div className="my-0.5 h-5 w-1/3 animate-pulse rounded bg-neutral-200" />
        ) : (
          selectedOption?.label
        )}
      </Combobox>
    </>
  );
}
