import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { Button, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useFormContext } from "react-hook-form";

function EndABTestingModal({
  showEndABTestingModal,
  setShowEndABTestingModal,
  onEndTest,
}: {
  showEndABTestingModal: boolean;
  setShowEndABTestingModal: Dispatch<SetStateAction<boolean>>;
  onEndTest?: () => void;
}) {
  const { watch: watchParent, setValue: setValueParent } =
    useFormContext<LinkFormData>();

  const testVariants = watchParent("testVariants") as Array<{
    url: string;
    percentage: number;
  }> | null;

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  return (
    <Modal
      showModal={showEndABTestingModal}
      setShowModal={setShowEndABTestingModal}
      className="sm:max-w-md"
    >
      <div className="p-4">
        <h3 className="text-lg font-medium">End A/B test</h3>

        <div className="mt-4">
          <p className="text-sm text-neutral-600">
            Select which destination URL to use as the current destination URL,
            and end the test. Save your changes on the link editor to confirm
            the change.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {testVariants?.map((test, index) => (
              <button
                key={index}
                onClick={() => setSelectedUrl(test.url)}
                className={`relative flex w-full items-center rounded-md border bg-white p-0 text-left ring-0 ring-black transition-all duration-100 hover:bg-neutral-50 ${
                  selectedUrl === test.url
                    ? "border-black ring-1"
                    : "border-neutral-300"
                }`}
              >
                <div className="flex grow items-center space-x-3 overflow-hidden">
                  <span className="flex h-9 w-8 shrink-0 items-center justify-center border-r border-neutral-300 text-center text-sm font-medium text-neutral-800">
                    {index + 1}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {test.url}
                  </span>
                </div>
                <div className="flex size-9 shrink-0 items-center justify-center">
                  <div
                    className={`size-4 rounded-full border transition-all ${
                      selectedUrl === test.url
                        ? "border-4 border-black"
                        : "border-neutral-400"
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-9 flex justify-end gap-2">
          <Button
            text="Cancel"
            variant="secondary"
            className="h-9 w-fit"
            onClick={() => {
              setSelectedUrl(null);
              setShowEndABTestingModal(false);
            }}
          />
          <Button
            text="End test"
            variant="primary"
            className="h-9 w-fit"
            disabled={!selectedUrl}
            onClick={() => {
              if (selectedUrl) {
                setValueParent("url", selectedUrl, { shouldDirty: true });
                setValueParent("testCompletedAt", new Date(), {
                  shouldDirty: true,
                });
                setShowEndABTestingModal(false);
                onEndTest?.();
              }
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

export function useEndABTestingModal({
  onEndTest,
}: {
  onEndTest?: () => void;
} = {}) {
  const [showEndABTestingModal, setShowEndABTestingModal] = useState(false);

  const EndABTestingModalCallback = useCallback(() => {
    return (
      <EndABTestingModal
        showEndABTestingModal={showEndABTestingModal}
        setShowEndABTestingModal={setShowEndABTestingModal}
        onEndTest={onEndTest}
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
