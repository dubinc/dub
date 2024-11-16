"use client";

import { refreshComplianceFlowAction } from "@/lib/actions/refresh-compliance-flow";
import { dotsFlowConfigurations } from "@/lib/dots/styles";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

export const ComplianceButton = () => {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isExecuting } = useAction(refreshComplianceFlowAction, {
    async onSuccess({ data }) {
      if (!data?.link) {
        toast.error("No link found – contact support");
        return;
      }

      setModalState({
        show: true,
        iframeSrc: `${data.link}?styles=${dotsFlowConfigurations}`,
      });
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  const [modalState, setModalState] = useState<{
    show: boolean;
    iframeSrc: string;
  }>({
    show: false,
    iframeSrc: "",
  });

  return (
    <>
      {modalState.show && (
        <Modal
          showModal={modalState.show}
          setShowModal={() => setModalState({ show: false, iframeSrc: "" })}
          className="h-[90vh] w-full max-w-[90vw] p-4"
        >
          <button
            onClick={() => setModalState({ show: false, iframeSrc: "" })}
            className="group absolute right-4 top-4 rounded-full p-2 transition-colors hover:bg-neutral-100"
          >
            <X className="size-5 text-neutral-700 transition-all group-hover:scale-110 group-active:scale-90" />
          </button>
          <iframe
            src={modalState.iframeSrc}
            className="h-full w-full rounded-lg"
          />
        </Modal>
      )}
      <Button
        variant="secondary"
        text="Submit KYB compliance"
        onClick={() => executeAsync({ workspaceId: workspaceId! })}
        loading={isExecuting}
        className="h-8 w-fit px-2"
      />
    </>
  );
};
