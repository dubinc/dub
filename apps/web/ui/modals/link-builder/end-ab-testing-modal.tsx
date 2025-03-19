import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";
import { LinkFormData } from ".";

function EndABTestingModal({
  showEndABTestingModal,
  setShowEndABTestingModal,
}: {
  showEndABTestingModal: boolean;
  setShowEndABTestingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch: watchParent, setValue: setValueParent } =
    useFormContext<LinkFormData>();

  const tests = watchParent("tests") as Array<{
    url: string;
    percentage: number;
  }> | null;

  return (
    <Modal
      showModal={showEndABTestingModal}
      setShowModal={setShowEndABTestingModal}
      className="sm:max-w-md"
    >
      <div className="p-4">
        <h3 className="text-lg font-medium">End A/B test</h3>

        <div className="mt-4">
          <p className="text-sm text-neutral-700">
            Select which destination URL to use as the current destination URL,
            and end the test. Save your changes on the link editor to confirm
            the change.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {tests?.map((test, index) => (
              <button
                key={index}
                onClick={() => {
                  setValueParent("url", test.url, { shouldDirty: true });
                  setValueParent("tests", null, { shouldDirty: true });
                  setValueParent("testsCompleteAt", null, {
                    shouldDirty: true,
                  });
                  setShowEndABTestingModal(false);
                }}
                className="flex w-full items-center justify-between rounded-md border border-neutral-200 p-3 text-left hover:border-neutral-700"
              >
                <div className="flex items-center space-x-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{test.url}</span>
                </div>
                <span className="text-sm text-neutral-500">
                  {test.percentage}%
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            text="Cancel"
            variant="secondary"
            onClick={() => setShowEndABTestingModal(false)}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useEndABTestingModal() {
  const [showEndABTestingModal, setShowEndABTestingModal] = useState(false);

  const EndABTestingModalCallback = useCallback(() => {
    return (
      <EndABTestingModal
        showEndABTestingModal={showEndABTestingModal}
        setShowEndABTestingModal={setShowEndABTestingModal}
      />
    );
  }, [showEndABTestingModal, setShowEndABTestingModal]);

  return useMemo(
    () => ({
      setShowEndABTestingModal,
      EndABTestingModal: EndABTestingModalCallback,
    }),
    [setShowEndABTestingModal, EndABTestingModalCallback],
  );
}
