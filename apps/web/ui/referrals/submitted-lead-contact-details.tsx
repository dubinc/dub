"use client";

import { SubmittedLeadProps } from "@/lib/types";
import { useConfirmSubmittedLeadStatusChangeModal } from "@/ui/modals/confirm-submitted-lead-status-change-modal";
import { useEditSubmittedLeadModal } from "@/ui/modals/edit-submitted-lead-modal";
import { SubmittedLeadStatus } from "@dub/prisma/client";
import { Button, Envelope, OfficeBuilding } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { Pencil } from "lucide-react";
import { SubmittedLeadStatusBadge } from "./submitted-lead-status-badge";
import { SubmittedLeadStatusDropdown } from "./submitted-lead-status-dropdown";
import { getCompanyLogoUrl } from "./submitted-lead-utils";

interface SubmittedLeadContactDetailsProps {
  referral: Pick<
    SubmittedLeadProps,
    "id" | "name" | "email" | "company" | "status"
  >;
  mode?: "interactive" | "readonly";
  selectedStatus?: SubmittedLeadStatus;
  onStatusChange?: (newStatus: SubmittedLeadStatus) => void;
}

export function SubmittedLeadContactDetails({
  referral,
  mode = "interactive",
  selectedStatus,
  onStatusChange,
}: SubmittedLeadContactDetailsProps) {
  const { EditSubmittedLeadModal, openEditSubmittedLeadModal } =
    useEditSubmittedLeadModal();
  const {
    ConfirmSubmittedLeadStatusChangeModal,
    openConfirmSubmittedLeadStatusChangeModal,
  } = useConfirmSubmittedLeadStatusChangeModal();

  const isInteractive = mode === "interactive";
  const isControlled = onStatusChange !== undefined;

  const handleStatusChange = (newStatus: SubmittedLeadStatus) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    } else {
      openConfirmSubmittedLeadStatusChangeModal(referral, newStatus);
    }
  };

  return (
    <>
      {isInteractive && <EditSubmittedLeadModal />}
      {isInteractive && !isControlled && ConfirmSubmittedLeadStatusChangeModal}
      <div className="border-border-subtle overflow-hidden rounded-xl border bg-white">
        <div className="flex items-start justify-between px-4 pt-4">
          <div className="relative w-fit shrink-0">
            <img
              src={
                getCompanyLogoUrl(referral.email) ||
                `${OG_AVATAR_URL}${referral.id}`
              }
              alt={referral.company}
              className="size-10 rounded-full"
            />
          </div>

          {isInteractive && (
            <Button
              type="button"
              variant="secondary"
              icon={<Pencil className="size-3.5" />}
              text="Edit"
              className="h-7 w-fit rounded-lg px-2"
              onClick={() =>
                openEditSubmittedLeadModal(referral as SubmittedLeadProps)
              }
            />
          )}
        </div>

        <div className="mt-2 px-4">
          <div className="text-content-emphasis text-base font-semibold">
            {referral.name}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 px-4">
          {[
            { icon: Envelope, value: referral.email },
            { icon: OfficeBuilding, value: referral.company },
          ].map(({ icon: Icon, value }, index) => (
            <div
              key={index}
              className="text-content-subtle flex items-center gap-1.5"
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="text-xs font-medium text-neutral-700">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-neutral-200 p-4">
          <div className="text-content-emphasis mb-2 text-base font-semibold">
            Referral stage
          </div>
          {isInteractive ? (
            <SubmittedLeadStatusDropdown
              referral={referral as SubmittedLeadProps}
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <SubmittedLeadStatusBadge status={referral.status} />
          )}
        </div>
      </div>
    </>
  );
}
