import useDomains from "@/lib/swr/use-domains";
import { Button, Combobox, Globe, StatusBadge } from "@dub/ui";
import { cn } from "@dub/utils";
import { useMemo, useRef, useState } from "react";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";

interface DomainSelectorProps {
  selectedDomain: string;
  setSelectedDomain: (domain: string) => void;
}

export function DomainSelector({
  selectedDomain,
  setSelectedDomain,
}: DomainSelectorProps) {
  const domainRef = useRef<HTMLDivElement>(null);
  const [openPopover, setOpenPopover] = useState(false);
  const { allWorkspaceDomains, loading } = useDomains();

  const { AddEditDomainModal, setShowAddEditDomainModal } =
    useAddEditDomainModal({
      onSuccess: (domain) => {
        setSelectedDomain(domain.slug);
      },
    });

  const domainOptions = useMemo(() => {
    return allWorkspaceDomains?.map((domain) => ({
      value: domain.slug,
      label: (
        <div className="flex items-center justify-between gap-2">
          {domain.slug}
          <StatusBadge variant={domain.verified ? "success" : "error"}>
            {domain.verified ? "Verified" : "Pending"}
          </StatusBadge>
        </div>
      ),
      icon: <Globe className="size-4 rounded-full" />,
    }));
  }, [allWorkspaceDomains]);

  const selectedOption = useMemo(() => {
    if (!selectedDomain) {
      return null;
    }

    const domain = [...(allWorkspaceDomains || [])].find(
      (d) => d.slug === selectedDomain,
    );

    if (!domain) {
      return null;
    }

    return {
      value: domain.slug,
      label: (
        <div className="flex items-center justify-between gap-2">
          {domain.slug}
          <StatusBadge variant={domain.verified ? "success" : "error"}>
            {domain.verified ? "Verified" : "Pending"}
          </StatusBadge>
        </div>
      ),
      icon: <Globe className="size-4 rounded-full" />,
    };
  }, [allWorkspaceDomains, selectedDomain]);

  return (
    <>
      <AddEditDomainModal />
      <div ref={domainRef}>
        <Combobox
          options={loading ? undefined : domainOptions}
          setSelected={(option) => {
            setSelectedDomain(option.value);
          }}
          selected={selectedOption}
          icon={loading ? null : selectedOption?.icon}
          caret={true}
          placeholder={loading ? "" : "Select domain"}
          searchPlaceholder="Search domain..."
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
              No domains found
              <Button
                onClick={() => {
                  setOpenPopover(false);
                  setShowAddEditDomainModal(true);
                }}
                variant="primary"
                className="h-7 w-fit px-2"
                text="Add custom domain"
              />
            </div>
          }
        >
          {loading ? (
            <div className="my-0.5 h-4 animate-pulse rounded bg-neutral-200" />
          ) : (
            selectedOption?.label
          )}
        </Combobox>
      </div>
    </>
  );
}
