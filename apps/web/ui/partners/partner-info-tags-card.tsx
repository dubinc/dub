"use client";

import { EnrolledPartnerExtendedProps } from "@/lib/types";
import { PartnerTagsList } from "./partner-tags-list";
import {
  UpdatePartnerTagsModal,
  useUpdatePartnerTagsModal,
} from "./update-partner-tags-modal";

export function PartnerInfoTagsCard({
  partner,
}: {
  partner: EnrolledPartnerExtendedProps;
}) {
  const { showUpdatePartnerTagsModal, setShowUpdatePartnerTagsModal } =
    useUpdatePartnerTagsModal();

  return (
    <div className="border-border-subtle flex flex-col border-t p-4">
      <UpdatePartnerTagsModal
        showUpdatePartnerTagsModal={showUpdatePartnerTagsModal}
        setShowUpdatePartnerTagsModal={setShowUpdatePartnerTagsModal}
        partners={[partner]}
      />
      <div className="mb-2 flex justify-between gap-2">
        <span className="text-content-emphasis block text-xs font-semibold">
          Tags
        </span>

        <button
          type="button"
          onClick={() => setShowUpdatePartnerTagsModal(true)}
          className="text-content-subtle hover:text-content-default text-xs font-medium"
        >
          Manage
        </button>
      </div>
      <PartnerTagsList
        tags={partner?.tags}
        wrap
        onAddTag={() => setShowUpdatePartnerTagsModal(true)}
        mode="link"
      />
    </div>
  );
}
