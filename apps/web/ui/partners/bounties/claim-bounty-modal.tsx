import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { Button, Calendar6, Modal, useRouterStuff } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { BountyThumbnailImage } from "./bounty-thumbnail-image";

type ClaimBountyModalProps = {
  setShowModal: Dispatch<SetStateAction<boolean>>;
  bounty: BountyProps;
};

function ClaimBountyModalContent({
  setShowModal,
  bounty,
}: ClaimBountyModalProps) {
  const { id: workspaceId } = useWorkspace();

  return (
    <div>
      <div className="relative flex h-[132px] items-center justify-center bg-neutral-100 py-3">
        <div className="relative size-full">
          <BountyThumbnailImage bounty={bounty} />
        </div>
      </div>

      <div className="flex flex-col gap-1 p-6 max-sm:px-4">
        <span className="text-content-emphasis truncate text-sm font-semibold">
          {bounty.name}
        </span>

        <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
          <Calendar6 className="size-3.5" />
          <span>
            {bounty.endsAt ? (
              <>
                Ends
                {formatDate(bounty.endsAt, { month: "short" })}
              </>
            ) : (
              "No end date"
            )}
          </span>
        </div>
      </div>

      {bounty.description && (
        <div className="border-border-subtle flex flex-col gap-2 border-t p-6 text-sm max-sm:px-4">
          <span className="text-content-emphasis font-semibold">Details</span>
          <p className="text-content-subtle font-medium">
            {bounty.description}
          </p>
        </div>
      )}

      <div className="border-border-subtle border-t p-5">
        <Button
          variant="primary"
          text="Claim bounty"
          className="rounded-lg"
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

export function ClaimBountyModal({
  showModal,
  ...rest
}: ClaimBountyModalProps & {
  showModal: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showModal}
      setShowModal={rest.setShowModal}
      onClose={() => queryParams({ del: "bountyId", scroll: false })}
    >
      <ClaimBountyModalContent {...rest} />
    </Modal>
  );
}

export function useClaimBountyModal(
  props: Omit<ClaimBountyModalProps, "setShowModal">,
) {
  const [showModal, setShowModal] = useState(false);

  return {
    claimBountyModal: (
      <ClaimBountyModal
        setShowModal={setShowModal}
        showModal={showModal}
        {...props}
      />
    ),
    setShowClaimBountyModal: setShowModal,
  };
}
