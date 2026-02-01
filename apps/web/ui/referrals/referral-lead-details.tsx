"use client";

import { ReferralProps } from "@/lib/types";
import { useConfirmReferralStatusChangeModal } from "@/ui/modals/confirm-referral-status-change-modal";
import { useEditReferralModal } from "@/ui/modals/edit-referral-modal";
import { ReferralStatus } from "@dub/prisma/client";
import { Button, Envelope, OfficeBuilding } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { Pencil } from "lucide-react";
import { ReferralStatusBadge } from "./referral-status-badge";
import { ReferralStatusDropdown } from "./referral-status-dropdown";
import { getCompanyLogoUrl } from "./referral-utils";

interface ReferralLeadDetailsProps {
  referral: Pick<ReferralProps, "id" | "name" | "email" | "company" | "status">;
  mode?: "interactive" | "readonly";
  selectedStatus?: ReferralStatus;
  onStatusChange?: (newStatus: ReferralStatus) => void;
}

export function ReferralLeadDetails({
  referral,
  mode = "interactive",
  selectedStatus,
  onStatusChange,
}: ReferralLeadDetailsProps) {
  const { EditReferralModal, openEditReferralModal } = useEditReferralModal();
  const {
    ConfirmReferralStatusChangeModal,
    openConfirmReferralStatusChangeModal,
  } = useConfirmReferralStatusChangeModal();

  const isInteractive = mode === "interactive";
  const isControlled = onStatusChange !== undefined;

  const handleStatusChange = (newStatus: ReferralStatus) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    } else {
      openConfirmReferralStatusChangeModal(referral, newStatus);
    }
  };

  return (
    <>
      {isInteractive && <EditReferralModal />}
      {isInteractive && !isControlled && <ConfirmReferralStatusChangeModal />}
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
              onClick={() => openEditReferralModal(referral as ReferralProps)}
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
            <ReferralStatusDropdown
              referral={referral as ReferralProps}
              selectedStatus={selectedStatus}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <ReferralStatusBadge status={referral.status} />
          )}
        </div>
      </div>
    </>
  );
}
