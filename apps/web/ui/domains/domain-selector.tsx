import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainVerificationStatusProps } from "@/lib/types";
import { Button, CircleCheck, Combobox, Globe, StatusBadge } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";
import DomainConfiguration from "./domain-configuration";

interface DomainSelectorProps {
  selectedDomain: string;
  setSelectedDomain: (domain: string) => void;
}

export function DomainSelector({
  selectedDomain,
  setSelectedDomain,
}: DomainSelectorProps) {
  const { id: workspaceId } = useWorkspace();
  const domainRef = useRef<HTMLDivElement>(null);
  const [openPopover, setOpenPopover] = useState(false);
  const { allWorkspaceDomains, loading } = useDomains();

  const { data: verificationData } = useSWRImmutable<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    workspaceId && selectedDomain
      ? `/api/domains/${selectedDomain}/verify?workspaceId=${workspaceId}`
      : null,
    fetcher,
  );

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

        {selectedDomain && verificationData && (
          <motion.div
            initial={false}
            animate={{ height: "auto" }}
            className="mt-5 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-5 pb-5"
          >
            {verificationData.status === "Valid Configuration" ? (
              <div className="mt-4 flex items-center gap-2 text-pretty rounded-lg bg-green-100/80 p-3 text-sm text-green-600">
                <CircleCheck className="h-5 w-5 shrink-0" />
                <div>
                  Good news! Your DNS records are set up correctly, but it can
                  take some time for them to propagate globally.{" "}
                  <Link
                    href="https://dub.co/help/article/how-to-add-custom-domain#how-long-do-i-have-to-wait-for-my-domain-to-work"
                    target="_blank"
                    className="underline transition-colors hover:text-green-800"
                  >
                    Learn more.
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <DomainConfiguration data={verificationData} />
              </div>
            )}
          </motion.div>
        )}
      </div>
    </>
  );
}
