import {
  LinkTestsSchema,
  MAX_TEST_COUNT,
  MIN_TEST_PERCENTAGE,
} from "@/lib/zod/schemas/links";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
} from "@dub/ui";
import {
  cn,
  formatDateTime,
  getDateTimeLocal,
  parseDateTime,
} from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { LinkFormData } from ".";

const parseTests = (tests: LinkFormData["tests"]) =>
  Array.isArray(tests) ? LinkTestsSchema.parse(tests) : null;

const fixPercentages = (tests: z.infer<typeof LinkTestsSchema>) => {
  // Round percentages down to the nearest integer
  let result = tests.map((test) => ({
    ...test,
    percentage: Math.floor(test.percentage),
  }));

  // Fix the last percentage to ensure the total is 100
  result[result.length - 1].percentage =
    100 - result.slice(0, -1).reduce((sum, test) => sum + test.percentage, 0);

  return result;
};

function ABTestingModal({
  showABTestingModal,
  setShowABTestingModal,
}: {
  showABTestingModal: boolean;
  setShowABTestingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const id = useId();

  const {
    watch: watchParent,
    getValues: getValuesParent,
    setValue: setValueParent,
  } = useFormContext<LinkFormData>();

  const domain = watchParent("domain");
  const { domains } = useAvailableDomains({
    currentDomain: domain,
  });

  const {
    watch,
    register,
    setValue,
    getValues,
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
        { url: getValuesParent("url") || "", percentage: 100 },
      ],
      testsCompleteAt: getValuesParent("testsCompleteAt") as Date | null,
    },
  });

  const tests = watch("tests") || [];
  const testsParent = watchParent("tests");

  const addTestUrl = () => {
    if (!tests.length || tests.length >= MAX_TEST_COUNT) return;

    const allEqual = tests.every(
      ({ percentage }) => Math.abs(percentage - tests[0].percentage) <= 1,
    );

    if (allEqual) {
      // All percentages are equal so let's keep it that way
      const each = Math.floor(100 / (tests.length + 1));
      setValue(
        "tests",
        [
          ...tests.map((t) => ({ ...t, percentage: each })),
          { url: "", percentage: 100 - each * tests.length },
        ],
        { shouldDirty: true },
      );
    } else {
      // Not all percentages are equal so let's split the latest one we can
      const toSplitIndex = tests.findLastIndex(
        ({ percentage }) => percentage >= MIN_TEST_PERCENTAGE * 2,
      );
      const toSplit = tests[toSplitIndex];
      const toSplitPercentage = Math.floor(toSplit.percentage / 2);
      const remainingPercentage = toSplit.percentage - toSplitPercentage;

      setValue(
        "tests",
        [
          ...tests.map((test, idx) => ({
            ...test,
            percentage:
              idx === toSplitIndex ? toSplitPercentage : test.percentage,
          })),
          { url: "", percentage: remainingPercentage },
        ],
        {
          shouldDirty: true,
        },
      );
    }
  };

  const removeTestUrl = (index: number) => {
    if (tests.length < 2) return;

    const allEqual = tests.every(
      ({ percentage }) => Math.abs(percentage - tests[0].percentage) <= 1,
    );

    if (allEqual) {
      // All percentages are equal so let's keep it that way
      const each = Math.floor(100 / (tests.length - 1));
      const remainder = 100 - each * (tests.length - 2);

      setValue(
        "tests",
        tests
          ?.filter((_, i) => i !== index)
          .map((test, idx, arr) => ({
            ...test,
            percentage: idx === arr.length - 1 ? remainder : each,
          })) ?? null,
        {
          shouldDirty: true,
        },
      );
    } else {
      // Not all percentages are equal so let's give the last one the remainder
      const remainder = tests[index].percentage;

      setValue(
        "tests",
        tests
          ?.filter((_, i) => i !== index)
          .map((test, idx, arr) => ({
            ...test,
            percentage:
              idx === arr.length - 1
                ? test.percentage + remainder
                : test.percentage,
          })) ?? null,
        {
          shouldDirty: true,
        },
      );
    }
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
                  <strong className="font-medium text-neutral-950">B</strong> to
                  open this quickly
                </div>
              }
              side="right"
            >
              <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
                B
              </kbd>
            </Tooltip>
          </div>
        </div>

        {/* Testing URLs */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-neutral-700">
              Testing URLs
            </label>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Add up to 3 additional destination URLs to test for this short link."
                  cta="Learn more"
                  href="https://dub.co/help/article/ab-testing" // TODO: Add article
                />
              }
            />
          </div>
          <div className="mt-2">
            <AnimatedSizeContainer
              height
              transition={{ ease: "easeInOut", duration: 0.2 }}
              className="-m-1"
            >
              <div className="flex flex-col gap-2 p-1">
                {tests.map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="relative block flex grow items-center overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
                      <span className="flex h-9 w-8 items-center justify-center border-r border-neutral-300 text-center text-sm font-medium text-neutral-800">
                        {index + 1}
                      </span>
                      <input
                        type="url"
                        placeholder={
                          domains?.find(({ slug }) => slug === domain)
                            ?.placeholder ||
                          "https://dub.co/help/article/what-is-dub"
                        }
                        className="block h-9 grow border-none px-2 text-neutral-900 placeholder-neutral-400 focus:ring-0 sm:text-sm"
                        {...register(`tests.${index}.url`)}
                      />
                      {index > 0 && (
                        <Button
                          onClick={() => removeTestUrl(index)}
                          variant="outline"
                          className="mr-1 size-7 p-0"
                          text={
                            <>
                              <span className="sr-only">Remove</span>
                              <X className="size-4" />
                            </>
                          }
                        />
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </AnimatedSizeContainer>

            <Button
              type="button"
              variant="primary"
              className="mt-2 h-8"
              onClick={addTestUrl}
              disabledTooltip={
                tests.length >= MAX_TEST_COUNT
                  ? `You may only add ${MAX_TEST_COUNT} URLs`
                  : undefined
              }
              text="Add URL"
            />
          </div>
        </div>

        {/* Traffic split */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-neutral-700">
              Traffic split
            </label>
            <InfoTooltip
              content={`Adjust the percentage of traffic to each URL. The minimum is ${MIN_TEST_PERCENTAGE}%`}
            />
          </div>
          <div className="mt-4">
            <TrafficSplitSlider
              tests={tests}
              onChange={(percentages) => {
                percentages.forEach((percentage, index) => {
                  setValue(`tests.${index}.percentage`, percentage, {
                    shouldDirty: true,
                  });
                });
              }}
            />
          </div>
        </div>

        {/* Completion Date */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <label
              htmlFor={`${id}-testsCompleteAt`}
              className="block text-sm font-medium text-neutral-700"
            >
              Completion Date
            </label>
            <InfoTooltip
              content={
                <SimpleTooltipContent
                  title="Set when the A/B test should complete. After this date, all traffic will go to the best performing URL."
                  cta="Learn more."
                  href="https://dub.co/help/article/ab-testing"
                />
              }
            />
          </div>
          <div className="mt-2 flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white shadow-sm transition-all focus-within:border-neutral-800 focus-within:outline-none focus-within:ring-1 focus-within:ring-neutral-500">
            <input
              id={`${id}-testsCompleteAt`}
              type="text"
              placeholder='E.g. "in 2 weeks" or "next month"'
              defaultValue={
                getValues("testsCompleteAt")
                  ? formatDateTime(getValues("testsCompleteAt") as Date)
                  : ""
              }
              onBlur={(e) => {
                if (e.target.value.length > 0) {
                  const parsedDateTime = parseDateTime(e.target.value);
                  if (parsedDateTime) {
                    setValue("testsCompleteAt", parsedDateTime, {
                      shouldDirty: true,
                    });
                    e.target.value = formatDateTime(parsedDateTime);
                  }
                }
              }}
              className="flex-1 border-none bg-transparent text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
            />
            <input
              type="datetime-local"
              id="testsCompleteAt"
              name="testsCompleteAt"
              value={
                getValues("testsCompleteAt")
                  ? getDateTimeLocal(getValues("testsCompleteAt") as Date)
                  : ""
              }
              onChange={(e) => {
                const completeDate = new Date(e.target.value);
                setValue("testsCompleteAt", completeDate, {
                  shouldDirty: true,
                });
              }}
              className="w-[40px] border-none bg-transparent text-neutral-500 focus:outline-none focus:ring-0 sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div></div>
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
                  : "Start testing"
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

  return useMemo(
    () => ({
      setShowABTestingModal,
      ABTestingModal: ABTestingModalCallback,
    }),
    [setShowABTestingModal, ABTestingModalCallback],
  );
}

function TrafficSplitSlider({
  tests,
  onChange,
}: {
  tests: { url: string; percentage: number }[];
  onChange: (percentages: number[]) => void;
}) {
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(index);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging === null || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.x;
      const mousePercentage = Math.round((mouseX / containerWidth) * 100);

      // Get sum of percentages to the left and right of the two being affected
      const leftPercentage = tests
        .slice(0, Math.max(0, isDragging))
        .reduce((sum, { percentage }) => sum + percentage, 0);
      const rightPercentage = tests
        .slice(isDragging + 2)
        .reduce((sum, { percentage }) => sum + percentage, 0);

      let newPercentages = tests.map(({ percentage }) => percentage);

      newPercentages[isDragging] = mousePercentage - leftPercentage;
      newPercentages[isDragging + 1] = 100 - rightPercentage - mousePercentage;

      // Ensure minimum 10% for each test
      if (newPercentages.every((p) => p >= MIN_TEST_PERCENTAGE)) {
        onChange(newPercentages);
      }
    },
    [isDragging, tests, onChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging !== null) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-10",
        isDragging !== null && "cursor-col-resize",
      )}
    >
      <div className="absolute inset-0 flex h-full">
        {tests.map((test, i) => (
          <div
            key={i}
            className="@container pointer-events-none relative flex h-full"
            style={{ width: `${test.percentage}%` }}
          >
            {i > 0 && <div className="w-1.5" />}
            <div className="flex h-full grow items-center justify-center gap-2 rounded-md border border-neutral-300 text-xs">
              <span className="text-xs font-semibold text-neutral-900">
                {i + 1}
              </span>
              <span className="@[64px]:block hidden font-medium text-neutral-600">
                {test.percentage}%
              </span>
            </div>
            {i < tests.length - 1 && (
              <>
                <div className="w-1.5" />
                <div
                  className="group pointer-events-auto absolute -right-1.5 flex h-full w-3 cursor-col-resize items-center px-1"
                  onMouseDown={handleMouseDown(i)}
                >
                  <div
                    className={cn(
                      "h-2/3 w-1 rounded-full bg-neutral-200",
                      isDragging === i
                        ? "bg-neutral-400"
                        : "group-hover:bg-neutral-300",
                    )}
                  />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
