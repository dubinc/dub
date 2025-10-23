import { useEmailDomains } from "@/lib/swr/use-email-domains";
import useProgram from "@/lib/swr/use-program";
import { useAddEditEmailDomainModal } from "@/ui/modals/add-edit-email-domain-modal";
import { Button, Combobox, StatusBadge } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode, useMemo, useRef, useState } from "react";

interface EmailDomainSelectorProps {
  selectedFromAddress: string;
  setSelectedFromAddress: (fromAddress: string) => void;
  disabled?: boolean;
  disabledTooltip?: string | ReactNode;
}

export function EmailDomainSelector({
  selectedFromAddress,
  setSelectedFromAddress,
  disabled = false,
  disabledTooltip,
}: EmailDomainSelectorProps) {
  const domainRef = useRef<HTMLDivElement>(null);
  const [openPopover, setOpenPopover] = useState(false);
  const { emailDomains, loading } = useEmailDomains();
  const { program } = useProgram();

  const { addEditEmailDomainModal, setIsOpen: setShowAddEditEmailDomainModal } =
    useAddEditEmailDomainModal({});

  const domainOptions = useMemo(() => {
    return emailDomains?.map((domain) => ({
      value: domain.fromAddress,
      label: (
        <div className="flex items-center justify-between gap-2">
          {program?.name} &lt;{domain.fromAddress}&gt;
          <StatusBadge
            variant={domain.status === "verified" ? "success" : "error"}
          >
            {domain.status === "verified" ? "Verified" : "Pending"}
          </StatusBadge>
        </div>
      ),
      disabledTooltip:
        domain.status !== "verified"
          ? "This email domain must be verified before it can be used"
          : undefined,
    }));
  }, [emailDomains, program?.name]);

  const selectedOption = useMemo(() => {
    if (!selectedFromAddress) {
      return null;
    }

    const domain = [...(emailDomains || [])].find(
      (d) => d.fromAddress === selectedFromAddress,
    );

    if (!domain) {
      return null;
    }

    return {
      value: domain.fromAddress,
      label: (
        <div className="flex items-center justify-between gap-2">
          {program?.name} &lt;{domain.fromAddress}&gt;
          <StatusBadge
            variant={domain.status === "verified" ? "success" : "error"}
            className="py-0.5"
          >
            {domain.status === "verified" ? "Verified" : "Pending"}
          </StatusBadge>
        </div>
      ),
    };
  }, [emailDomains, selectedFromAddress, program?.name]);

  return (
    <>
      {addEditEmailDomainModal}
      <div ref={domainRef}>
        <Combobox
          options={loading ? undefined : domainOptions}
          setSelected={(option) => {
            setSelectedFromAddress(option?.value || null);
          }}
          selected={selectedOption}
          caret={true}
          placeholder={loading ? "" : "Select email domain"}
          matchTriggerWidth
          shouldFilter={false}
          hideSearch
          open={disabled ? false : openPopover}
          onOpenChange={disabled ? undefined : setOpenPopover}
          buttonProps={{
            disabled,
            disabledTooltip,
            className: cn(
              "w-full justify-start border-transparent px-1.5",
              "hover:border-border-subtle hover:bg-neutral-100",
              "data-[state=open]:ring-1 data-[state=open]:ring-black/75 data-[state=open]:border-black/75",
              "focus:ring-1 focus:ring-black/75 focus:border-black/75 transition-colors duration-150",
              "h-8 rounded-md",
            ),
          }}
          emptyState={
            <div className="flex w-full flex-col items-center gap-2 py-4">
              No email domains found
              <Button
                onClick={() => {
                  if (disabled) return;
                  setOpenPopover(false);
                  setShowAddEditEmailDomainModal(true);
                }}
                variant="primary"
                className="h-7 w-fit px-2"
                text="Add email domain"
                disabled={disabled}
              />
            </div>
          }
        >
          {loading ? (
            <div className="my-0.5 h-5 animate-pulse rounded bg-neutral-200" />
          ) : (
            selectedOption?.label
          )}
        </Combobox>
      </div>
    </>
  );
}
