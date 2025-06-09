import {
  ABTestVariantsSchema,
  MAX_TEST_COUNT,
  MIN_TEST_PERCENTAGE,
} from "@/lib/zod/schemas/links";
import { LinkFormData } from "@/ui/links/link-builder/link-builder-provider";
import { useLinkBuilderKeyboardShortcut } from "@/ui/links/link-builder/use-link-builder-keyboard-shortcut";
import { useAvailableDomains } from "@/ui/links/use-available-domains";
import { useEndABTestingModal } from "@/ui/modals/link-builder/ab-testing/end-ab-testing-modal";
import { BusinessBadgeTooltip } from "@/ui/shared/business-badge-tooltip";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  Flask,
  InfoTooltip,
  Modal,
  SimpleTooltipContent,
  Tooltip,
  TriangleWarning,
} from "@dub/ui";
import {
  cn,
  formatDateTime,
  getDateTimeLocal,
  isValidUrl,
  parseDateTime,
} from "@dub/utils";
import { differenceInDays } from "date-fns";
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

const parseTests = (testVariants: LinkFormData["testVariants"]) =>
  Array.isArray(testVariants) ? ABTestVariantsSchema.parse(testVariants) : null;

const inTwoWeeks = new Date(Date.now() + 2 * 7 * 24 * 60 * 60 * 1000);

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

  const { EndABTestingModal, setShowEndABTestingModal } = useEndABTestingModal({
    onEndTest: () => setShowABTestingModal(false),
  });

  const {
    watch,
    register,
    setValue,
    getValues,
    reset,
    formState: { isDirty, isValid },
    handleSubmit,
  } = useForm<
    { testVariants: z.infer<typeof ABTestVariantsSchema> } & Pick<
      LinkFormData,
      "testCompletedAt"
    >
  >({
    mode: "onChange",
    values: {
      testVariants: parseTests(getValuesParent("testVariants")) ?? [
        { url: getValuesParent("url") || "", percentage: 100 },
      ],
      testCompletedAt:
        (getValuesParent("testCompletedAt") as Date | null) ?? inTwoWeeks,
    },
  });

  const testVariants = watch("testVariants") || [];
  const testCompletedAt = watch("testCompletedAt");
  const [idParent, testVariantsParent] = watchParent(["id", "testVariants"]);

  const addTestUrl = () => {
    if (!testVariants.length || testVariants.length >= MAX_TEST_COUNT) return;

    const allEqual = testVariants.every(
      ({ percentage }) =>
        Math.abs(percentage - testVariants[0].percentage) <= 1,
    );

    if (allEqual) {
      // All percentages are equal so let's keep it that way
      const each = Math.floor(100 / (testVariants.length + 1));
      setValue(
        "testVariants",
        [
          ...testVariants.map((t) => ({ ...t, percentage: each })),
          { url: "", percentage: 100 - each * testVariants.length },
        ],
        { shouldDirty: true },
      );
    } else {
      // Not all percentages are equal so let's split the latest one we can
      const toSplitIndex = testVariants.findLastIndex(
        ({ percentage }) => percentage >= MIN_TEST_PERCENTAGE * 2,
      );
      const toSplit = testVariants[toSplitIndex];
      const toSplitPercentage = Math.floor(toSplit.percentage / 2);
      const remainingPercentage = toSplit.percentage - toSplitPercentage;

      setValue(
        "testVariants",
        [
          ...testVariants.map((test, idx) => ({
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
    if (testVariants.length < 2) return;

    const allEqual = testVariants.every(
      ({ percentage }) =>
        Math.abs(percentage - testVariants[0].percentage) <= 1,
    );

    if (allEqual) {
      // All percentages are equal so let's keep it that way
      const each = Math.floor(100 / (testVariants.length - 1));
      const remainder = 100 - each * (testVariants.length - 2);

      setValue(
        "testVariants",
        testVariants
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
      const remainder = testVariants[index].percentage;

      setValue(
        "testVariants",
        testVariants
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
      <EndABTestingModal />
      <form
        className="px-5 py-4"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit((data) => {
            const currentTests = data.testVariants;

            if (!currentTests || currentTests.length <= 1) {
              setValueParent("testVariants", null, { shouldDirty: true });
              setValueParent("testCompletedAt", null, {
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
            setValueParent("trackConversion", true);
            setValueParent("testVariants", currentTests, { shouldDirty: true });
            setValueParent("testCompletedAt", data.testCompletedAt, {
              shouldDirty: true,
            });
            setShowABTestingModal(false);
          })(e);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">A/B Testing</h3>
            <BusinessBadgeTooltip
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
                  <strong className="font-medium text-neutral-950">A</strong> to
                  open this quickly
                </div>
              }
              side="right"
            >
              <kbd className="flex size-6 cursor-default items-center justify-center rounded-md border border-neutral-200 font-sans text-xs text-neutral-950">
                A
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
                {testVariants.map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="relative flex grow items-center overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
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
                        {...register(`testVariants.${index}.url`, {
                          validate: (value, { testVariants }) => {
                            if (!value) return "URL is required";

                            if (!isValidUrl(value)) return "Invalid URL";

                            return (
                              testVariants.length > 1 &&
                              testVariants.length <= MAX_TEST_COUNT
                            );
                          },
                        })}
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
                testVariants.length >= MAX_TEST_COUNT
                  ? `You may only add up to ${MAX_TEST_COUNT} URLs for an A/B test`
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
              Traffic Split
            </label>
            <InfoTooltip
              content={`Adjust the percentage of traffic to each URL. The minimum is ${MIN_TEST_PERCENTAGE}%`}
            />
          </div>
          <div className="mt-4">
            <TrafficSplitSlider
              testVariants={testVariants}
              onChange={(percentages) => {
                percentages.forEach((percentage, index) => {
                  setValue(`testVariants.${index}.percentage`, percentage, {
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
              htmlFor={`${id}-testCompletedAt`}
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
              id={`${id}-testCompletedAt`}
              type="text"
              placeholder='E.g. "in 2 weeks" or "next month"'
              defaultValue={
                getValues("testCompletedAt")
                  ? formatDateTime(getValues("testCompletedAt") as Date)
                  : ""
              }
              onBlur={(e) => {
                if (e.target.value.length > 0) {
                  const parsedDateTime = parseDateTime(e.target.value);
                  if (parsedDateTime) {
                    setValue("testCompletedAt", parsedDateTime, {
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
              value={
                getValues("testCompletedAt")
                  ? getDateTimeLocal(getValues("testCompletedAt") as Date)
                  : ""
              }
              onChange={(e) => {
                const completeDate = new Date(e.target.value);
                setValue("testCompletedAt", completeDate, {
                  shouldDirty: true,
                });
              }}
              className="w-[40px] border-none bg-transparent text-neutral-500 focus:outline-none focus:ring-0 sm:text-sm"
            />
          </div>
          <p className="mt-1 text-xs text-neutral-500">6 weeks maximum</p>
        </div>

        {testVariantsParent && (
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <TriangleWarning className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <p className="text-sm font-medium text-amber-900">
              Changing the original A/B test settings will impact your future
              analytics and event tracking.
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div>
            {Boolean(testVariantsParent) && (
              <button
                type="button"
                className="text-xs font-medium text-neutral-700 transition-colors hover:text-neutral-950"
                onClick={() => {
                  if (idParent) {
                    setShowEndABTestingModal(true);
                  } else {
                    (["testVariants", "testCompletedAt"] as const).forEach(
                      (key) => setValueParent(key, null, { shouldDirty: true }),
                    );
                    setShowABTestingModal(false);
                  }
                }}
              >
                {idParent ? "End" : "Remove"} A/B test
              </button>
            )}
          </div>
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
                Array.isArray(testVariantsParent) &&
                testVariantsParent.length > 1
                  ? "Save changes"
                  : "Start testing"
              }
              className="h-9 w-fit"
              disabled={
                !isDirty ||
                !isValid ||
                Boolean(
                  testCompletedAt &&
                    // Restrict competion date from -1 days to 6 weeks
                    (differenceInDays(testCompletedAt, new Date()) > 6 * 7 ||
                      differenceInDays(testCompletedAt, new Date()) < -1),
                )
              }
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function getABTestingLabel({
  testVariants,
  testCompletedAt,
}: Pick<LinkFormData, "testVariants" | "testCompletedAt">) {
  const enabled = Boolean(testVariants && testCompletedAt);

  if (testCompletedAt && new Date(testCompletedAt) < new Date())
    return "Test Complete";

  return enabled && Array.isArray(testVariants)
    ? `${testVariants?.length} URLs`
    : "A/B Test";
}

function ABTestingButton({
  setShowABTestingModal,
}: {
  setShowABTestingModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { watch } = useFormContext<LinkFormData>();
  const [testVariants, testCompletedAt] = watch([
    "testVariants",
    "testCompletedAt",
  ]);

  useLinkBuilderKeyboardShortcut("a", () => setShowABTestingModal(true));

  const enabled = Boolean(testVariants && testCompletedAt);

  const label = useMemo(
    () => getABTestingLabel({ testVariants, testCompletedAt }),
    [testVariants, testCompletedAt],
  );

  return (
    <Button
      variant="secondary"
      text={label}
      icon={<Flask className={cn("size-4", enabled && "text-blue-500")} />}
      className="h-8 w-fit gap-1.5 px-2.5 text-xs font-medium text-neutral-700"
      onClick={() => setShowABTestingModal(true)}
    />
  );
}

export function useABTestingModal() {
  const [showABTestingModal, setShowABTestingModal] = useState(false);

  const ABTestingModalCallback = useCallback(() => {
    return (
      <>
        <ABTestingModal
          showABTestingModal={showABTestingModal}
          setShowABTestingModal={setShowABTestingModal}
        />
      </>
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

function TrafficSplitSlider({
  testVariants,
  onChange,
}: {
  testVariants: { url: string; percentage: number }[];
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
      const leftPercentage = testVariants
        .slice(0, Math.max(0, isDragging))
        .reduce((sum, { percentage }) => sum + percentage, 0);
      const rightPercentage = testVariants
        .slice(isDragging + 2)
        .reduce((sum, { percentage }) => sum + percentage, 0);

      let newPercentages = testVariants.map(({ percentage }) => percentage);

      newPercentages[isDragging] = mousePercentage - leftPercentage;
      newPercentages[isDragging + 1] = 100 - rightPercentage - mousePercentage;

      // Ensure minimum 10% for each test
      if (newPercentages.every((p) => p >= MIN_TEST_PERCENTAGE)) {
        onChange(newPercentages);
      }
    },
    [isDragging, testVariants, onChange],
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
        {testVariants.map((test, i) => (
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
            {i < testVariants.length - 1 && (
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
