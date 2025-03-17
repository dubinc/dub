import { LinkTestsSchema } from "@/lib/zod/schemas/links";
import {
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  useKeyboardShortcut,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { BeakerIcon } from "lucide-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { LinkFormData } from ".";

const parseTests = (tests: LinkFormData["tests"]) =>
  Array.isArray(tests) ? LinkTestsSchema.parse(tests) : null;

function ABTestingModal({
  showABTestingModal,
  setShowABTestingModal,
}: {
  showABTestingModal: boolean;
  setShowABTestingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { isMobile } = useMediaQuery();
  const id = useId();

  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const {
    watch,
    register,
    setValue,
    reset,
    formState: { isDirty },
    handleSubmit,
  } = useForm<
    { tests: z.infer<typeof LinkTestsSchema> } & Pick<
      LinkFormData,
      "testsCompleteAt"
    >
  >({
    values: {
      tests: parseTests(getValuesParent("tests")) ?? [
        { url: getValuesParent("url") || "", percentage: 50 },
      ],
      testsCompleteAt: getValuesParent("testsCompleteAt") as Date | null,
    },
  });

  const tests = watch("tests") || [];
  const testsParent = watchParent("tests");

  const addTestUrl = () => {
    if (tests && tests.length >= 4) {
      toast.error("You can only add up to 4 test URLs");
      return;
    }

    const newTest = { url: "", percentage: 0 };

    setValue("tests", [...(tests || []), newTest], {
      shouldDirty: true,
    });
  };

  const removeTestUrl = (index: number) => {
    setValue("tests", tests?.filter((_, i) => i !== index) ?? null, {
      shouldDirty: true,
    });
  };

  return (
    <Modal
      showModal={showABTestingModal}
      setShowModal={setShowABTestingModal}
      className="sm:max-w-md"
    >
      <form
        className="px-5 py-4"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit((data) => {
            const currentTests = data.tests;

            if (!currentTests?.length) {
              setValueParent("tests", null, { shouldDirty: true });
              setValueParent("testsCompleteAt", null, {
                shouldDirty: true,
              });

              return;
            }

            // Validate total percentage equals 100
            const totalPercentage = currentTests.reduce(
              (sum, test) => sum + test.percentage,
              0,
            );

            if (totalPercentage !== 100) {
              toast.error("Total percentage must equal 100%");
              return;
            }

            // Validate all URLs are filled
            if (currentTests.some((test) => !test.url)) {
              toast.error("All test URLs must be filled");
              return;
            }

            setValueParent("url", currentTests[0].url, { shouldDirty: true });
            setValueParent("tests", currentTests, { shouldDirty: true });
            setValueParent("testsCompleteAt", data.testsCompleteAt, {
              shouldDirty: true,
            });
            setShowABTestingModal(false);
          })(e);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">A/B Testing</h3>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Test different URLs against each other to optimize your conversion rates."
                  cta="Learn more."
                  href="https://dub.co/help/article/ab-testing"
                />
              }
            />
          </div>
          <div className="max-md:hidden">
            <Tooltip
              content={
                <div className="px-2 py-1 text-xs text-neutral-700">
                  Press{" "}
                  <strong className="font-medium text-neutral-950">X</strong> to
                  open this quickly
                </div>
              }
              side="right"
            >
              <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
                X
              </kbd>
            </Tooltip>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {tests.map((test, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="flex-1">
                <input
                  type="url"
                  placeholder="Enter test URL"
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm"
                  {...register(`tests.${index}.url`)}
                />
              </div>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="%"
                  className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 sm:text-sm"
                  {...register(`tests.${index}.percentage`, {
                    valueAsNumber: true,
                  })}
                />
              </div>
              {index > 0 && (
                <Button
                  onClick={() => removeTestUrl(index)}
                  variant="ghost"
                  className="px-3"
                >
                  <span className="sr-only">Remove</span>×
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            className="mt-2 w-full justify-center"
            onClick={addTestUrl}
            disabled={tests.length >= 4}
          >
            Add Test URL
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => {
                reset();
                setShowABTestingModal(false);
              }}
            />
            <Button
              type="submit"
              variant="primary"
              text={
                Array.isArray(testsParent) && testsParent.length > 0
                  ? "Save changes"
                  : "Add A/B testing"
              }
              className="h-9 w-fit"
              disabled={!isDirty}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function getABTestingLabel({ tests }: { tests: unknown }) {
  if (!Array.isArray(tests)) return "A/B Testing";
  return tests.length > 0
    ? `${tests.length} Test${tests.length > 1 ? "s" : ""}`
    : "A/B Testing";
}

function ABTestingButton({
  setShowABTestingModal,
}: {
  setShowABTestingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const tests = watch("tests");

  useKeyboardShortcut("x", () => setShowABTestingModal(true), {
    modal: true,
  });

  return (
    <Button
      variant="secondary"
      text={getABTestingLabel({ tests })}
      icon={
        <BeakerIcon
          className={cn(
            "size-4",
            Array.isArray(tests) && tests.length > 0 && "text-blue-500",
          )}
        />
      }
      className="h-9 w-fit px-2.5 font-medium text-neutral-700"
      onClick={() => setShowABTestingModal(true)}
    />
  );
}

export function useABTestingModal() {
  const [showABTestingModal, setShowABTestingModal] = useState(false);

  const ABTestingModalCallback = useCallback(() => {
    return (
      <ABTestingModal
        showABTestingModal={showABTestingModal}
        setShowABTestingModal={setShowABTestingModal}
      />
    );
  }, [showABTestingModal, setShowABTestingModal]);

  const ABTestingButtonCallback = useCallback(() => {
    return <ABTestingButton setShowABTestingModal={setShowABTestingModal} />;
  }, [setShowABTestingModal]);

  return useMemo(
    () => ({
      setShowABTestingModal,
      ABTestingModal: ABTestingModalCallback,
      ABTestingButton: ABTestingButtonCallback,
    }),
    [setShowABTestingModal, ABTestingModalCallback, ABTestingButtonCallback],
  );
}
