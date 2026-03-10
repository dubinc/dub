"use client";

import usePartnerCustomer from "@/lib/swr/use-partner-customer";
import { PartnerProfileCustomerProps } from "@/lib/types";
import { Combobox, ComboboxProps } from "@dub/ui";
import { fetcher, OG_AVATAR_URL } from "@dub/utils";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import useSWR from "swr";

type PartnerCustomer = PartnerProfileCustomerProps & { name?: string | null };

type PartnerCustomerSelectorProps = {
  selectedCustomerId: string | null;
  setSelectedCustomerId: (customerId: string) => void;
  disabled?: boolean;
  variant?: "default" | "header";
} & Partial<ComboboxProps<false, any>>;

export function PartnerCustomerSelector({
  selectedCustomerId,
  setSelectedCustomerId,
  disabled,
  variant = "header",
  ...rest
}: PartnerCustomerSelectorProps) {
  const { programSlug } = useParams<{ programSlug: string }>();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const [openPopover, setOpenPopover] = useState(false);

  const { data: customers, isLoading: loading } = useSWR<PartnerCustomer[]>(
    programSlug
      ? `/api/partner-profile/programs/${programSlug}/customers?pageSize=100${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`
      : null,
    fetcher,
    { keepPreviousData: true },
  );

  const { data: selectedCustomer, isLoading: selectedCustomerLoading } =
    usePartnerCustomer({
      customerId: selectedCustomerId ?? "",
    });

  const customerOptions = useMemo(() => {
    return customers?.map((customer) => ({
      value: customer.id,
      label: customer.name || customer.email ?? "",
      icon: (
        <img
          src={`${OG_AVATAR_URL}${customer.id}`}
          alt=""
          className="size-4 rounded-full"
        />
      ),
    }));
  }, [customers]);

  const selectedOption = useMemo(() => {
    if (!selectedCustomerId || !selectedCustomer) return null;
    return {
      value: selectedCustomer.id,
      label: selectedCustomer.name || selectedCustomer.email ?? "",
      icon: (
        <img
          src={`${OG_AVATAR_URL}${selectedCustomer.id}`}
          alt=""
          className="size-4 rounded-full"
        />
      ),
    };
  }, [selectedCustomerId, selectedCustomer]);

  return (
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
      searchPlaceholder="Search customers..."
      onSearchChange={setSearch}
      shouldFilter={false}
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
              className:
                "w-full justify-start border-neutral-300 px-3 rounded-lg",
            },
          })}
      {...rest}
    >
      {variant === "header" && !selectedOption?.label ? (
        <div className="h-6 w-[120px] animate-pulse rounded bg-neutral-100" />
      ) : selectedCustomerLoading && selectedCustomerId ? (
        <div className="h-6 w-[120px] animate-pulse rounded bg-neutral-100" />
      ) : (
        selectedOption?.label
      )}
    </Combobox>
  );
}
