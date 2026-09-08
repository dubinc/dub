import useProgram from "@/lib/swr/use-program";
import { SimpleLinkCard } from "@/ui/links/simple-link-card";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type ChangeProgramDomainModalProps = {
  showChangeDomainModal: boolean;
  setShowChangeDomainModal: Dispatch<SetStateAction<boolean>>;
  newDomain: string;
  onConfirm: () => Promise<void>;
};

function ChangeProgramDomainModal(props: ChangeProgramDomainModalProps) {
  return (
    <Modal
      showModal={props.showChangeDomainModal}
      setShowModal={props.setShowChangeDomainModal}
    >
      <ChangeProgramDomainModalInner {...props} />
    </Modal>
  );
}

function ChangeProgramDomainModalInner({
  setShowChangeDomainModal,
  newDomain,
  onConfirm,
}: ChangeProgramDomainModalProps) {
  const [confirming, setConfirming] = useState(false);
  const [verificationText, setVerificationText] = useState("");
  const { isMobile } = useMediaQuery();
  const { program: { domain: currentDomain, url } = {} } = useProgram();

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm();
      setShowChangeDomainModal(false);
    } finally {
      setConfirming(false);
    }
  };

  if (!currentDomain || !url) return null;

  return (
    <>
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Switching to a different program domain
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <div className="scrollbar-hide mb-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          <SimpleLinkCard
            link={{
              shortLink: `https://${newDomain}`,
              url: url,
            }}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm text-neutral-800">
            You've selected <strong className="text-black">{newDomain}</strong>,
            which is different from your program's current domain{" "}
            <strong className="text-black">{currentDomain}</strong>.
          </p>
          <p className="text-sm text-neutral-800">
            By making this change, you will:
          </p>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-800">
            <li>
              Change the program's primary domain to{" "}
              <strong className="text-black">{newDomain}</strong>.
            </li>
            <li>
              Update all default links across all partner groups to use the{" "}
              <strong className="text-black">{newDomain}</strong> domain.
            </li>
            <li>
              Automatically update all partner links to use{" "}
              <strong className="text-black">{newDomain}</strong>, potentially
              breaking them.
            </li>
          </ul>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (verificationText === "confirm change program domain") {
            await handleConfirm();
          }
        }}
        className="flex flex-col bg-neutral-50 text-left"
      >
        <div className="px-4 sm:px-6">
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold">confirm change program domain</span>{" "}
            below
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern="confirm change program domain"
              required
              autoFocus={!isMobile}
              autoComplete="off"
              value={verificationText}
              onChange={(e) => setVerificationText(e.target.value)}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
          <Button
            onClick={() => setShowChangeDomainModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            disabled={verificationText !== "confirm change program domain"}
            loading={confirming}
            text="Continue"
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </>
  );
}

export function useChangeProgramDomainModal({
  newDomain,
  onConfirm,
}: {
  newDomain: string;
  onConfirm: () => Promise<void>;
}) {
  const [showChangeDomainModal, setShowChangeDomainModal] = useState(false);

  const ChangeDomainModalCallback = useCallback(() => {
    return (
      <ChangeProgramDomainModal
        showChangeDomainModal={showChangeDomainModal}
        setShowChangeDomainModal={setShowChangeDomainModal}
        newDomain={newDomain}
        onConfirm={onConfirm}
      />
    );
  }, [showChangeDomainModal, setShowChangeDomainModal]);

  return useMemo(
    () => ({
      setShowChangeDomainModal,
      ChangeDomainModal: ChangeDomainModalCallback,
    }),
    [setShowChangeDomainModal, ChangeDomainModalCallback],
  );
}
