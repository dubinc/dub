import { STORE_KEYS, useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { Button, Modal, useScrollProgress } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { RegisterDomainForm } from "../domains/register-domain-form";
import { ModalHero } from "../shared/modal-hero";

function DotLinkOfferModal({
  showDotLinkOfferModal,
  setShowDotLinkOfferModal,
}: {
  showDotLinkOfferModal: boolean;
  setShowDotLinkOfferModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [_, setDotLinkOfferDismissed, { mutateWorkspace }] =
    useWorkspaceStore<boolean>(STORE_KEYS.dotLinkOfferDismissed);

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const onClose = async () => {
    await setDotLinkOfferDismissed(true);
    mutateWorkspace();
  };

  return (
    <Modal
      showModal={showDotLinkOfferModal}
      setShowModal={setShowDotLinkOfferModal}
      onClose={onClose}
    >
      <div className="flex flex-col">
        <ModalHero />
        <div className="px-6 py-8 sm:px-8">
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide max-h-[calc(100vh-350px)] overflow-y-auto pb-6 text-left"
            >
              <h1 className="text-lg font-semibold text-neutral-900">
                Get more from your short links
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                Increase your click-through rate by redeeming a{" "}
                <strong className="font-semibold text-neutral-800">
                  free .link domain for 1-year with your paid account
                </strong>
                .
              </p>
              <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                <RegisterDomainForm
                  onSuccess={() => {
                    setShowDotLinkOfferModal(false);
                  }}
                  onCancel={() => setShowDotLinkOfferModal(false)}
                />
              </div>
            </div>
            {/* Bottom scroll fade */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
              style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
            ></div>
          </div>
          <Button
            type="button"
            variant="secondary"
            text="No thanks, maybe later"
            onClick={() => {
              onClose();
              setShowDotLinkOfferModal(false);
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useDotLinkOfferModal() {
  const [showDotLinkOfferModal, setShowDotLinkOfferModal] = useState(false);

  const DotLinkOfferModalCallback = useCallback(() => {
    return (
      <DotLinkOfferModal
        showDotLinkOfferModal={showDotLinkOfferModal}
        setShowDotLinkOfferModal={setShowDotLinkOfferModal}
      />
    );
  }, [showDotLinkOfferModal, setShowDotLinkOfferModal]);

  return useMemo(
    () => ({
      setShowDotLinkOfferModal,
      DotLinkOfferModal: DotLinkOfferModalCallback,
    }),
    [setShowDotLinkOfferModal, DotLinkOfferModalCallback],
  );
}
