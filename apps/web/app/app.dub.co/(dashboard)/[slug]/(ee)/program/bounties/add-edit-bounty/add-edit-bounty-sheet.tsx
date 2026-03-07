import {
  BOUNTY_DESCRIPTION_MAX_LENGTH,
  SUBMISSION_FREQUENCY_OPTIONS,
} from "@/lib/bounty/constants";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps, CreateBountyInput } from "@/lib/types";
import { GroupsMultiSelect } from "@/ui/partners/groups/groups-multi-select";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { RewardIconSquare } from "@/ui/partners/rewards/reward-icon-square";
import { X } from "@/ui/shared/icons";
import {
  InlineBadgePopover,
  InlineBadgePopoverInput,
} from "@/ui/shared/inline-badge-popover";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { BountySubmissionFrequency } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  Button,
  CalendarIcon,
  CardSelector,
  CardSelectorOption,
  Combobox,
  ComboboxOption,
  NumberStepper,
  RichTextArea,
  RichTextProvider,
  RichTextToolbar,
  Sheet,
  SmartDateTimePicker,
  Switch,
  Tooltip,
  TooltipContent,
  useRouterStuff,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { Controller, FormProvider } from "react-hook-form";
import { BountyCriteria } from "./bounty-criteria";
import { useAddEditBountyForm } from "./use-add-edit-bounty-form";

interface BountySheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  bounty?: BountyProps;
}

const BOUNTY_TYPES: CardSelectorOption[] = [
  {
    key: "performance",
    label: "Performance",
    description: "Reward for reaching milestones",
  },
  {
    key: "submission",
    label: "Submission",
    description: "Reward for task completion",
  },
];

function BountySheetContent({ setIsOpen, bounty }: BountySheetProps) {
  const { program } = useProgram();
  const { plan, slug: workspaceSlug } = useWorkspace();

  const {
    form,
    openAccordions,
    setOpenAccordions,
    hasStartDate,
    handleStartDateToggle,
    hasEndDate,
    handleEndDateToggle,
    handleEndDateChange,
    allowedSubmissions,
    handleAllowedSubmissionsChange,
    maxAllowedSubmissions,
    submissionWindow,
    handleSubmissionWindowToggle,
    handleSubmissionWindowChange,
    submissionFrequency,
    handleSubmissionFrequencyToggle,
    handleSubmissionFrequencyChange,
    type,
    name,
    control,
    register,
    setValue,
    watch,
    errors,
    isDirty,
    validationError,
    confirmCreateBountyModal,
    onSubmit,
    isSubmitting,
  } = useAddEditBountyForm({ bounty, setIsOpen });

  const submissionRequirements = watch("submissionRequirements");
  const hasSocialMetrics =
    submissionRequirements &&
    typeof submissionRequirements === "object" &&
    "socialMetrics" in submissionRequirements;
  const canUseBountySocialMetrics =
    getPlanCapabilities(plan).canUseBountySocialMetrics;
  const showBountySocialMetricsUpsell =
    hasSocialMetrics && !canUseBountySocialMetrics;

  return (
    <form onSubmit={onSubmit} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {bounty ? "Update" : "Create"} bounty
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>
      </div>

      <FormProvider {...form}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <ProgramSheetAccordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-6"
            >
              {!bounty && ( // cannot change type for existing bounties
                <ProgramSheetAccordionItem value="bounty-type">
                  <ProgramSheetAccordionTrigger>
                    Type
                  </ProgramSheetAccordionTrigger>
                  <ProgramSheetAccordionContent>
                    <div className="space-y-4">
                      <p className="text-content-default text-sm">
                        Set how the bounty will be completed
                      </p>
                      <CardSelector
                        options={BOUNTY_TYPES}
                        value={watch("type")}
                        onChange={(value: CreateBountyInput["type"]) =>
                          setValue("type", value)
                        }
                        name="bounty-type"
                      />
                    </div>
                  </ProgramSheetAccordionContent>
                </ProgramSheetAccordionItem>
              )}

              <ProgramSheetAccordionItem value="bounty-details">
                <ProgramSheetAccordionTrigger>
                  Details
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <div className="space-y-6">
                    {type === "submission" && (
                      <>
                        <div>
                          <label
                            htmlFor="name"
                            className="text-sm font-medium text-neutral-800"
                          >
                            Name
                          </label>
                          <div className="mt-2">
                            <input
                              id="name"
                              type="text"
                              maxLength={100}
                              className={cn(
                                "block w-full rounded-md border-neutral-300 px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                errors.name &&
                                  "border-red-600 focus:border-red-500 focus:ring-red-600",
                              )}
                              placeholder={`Create a YouTube video about${program?.name ? ` ${program.name}` : ""}...`}
                              {...register("name", {
                                setValueAs: (value) =>
                                  value === "" ? null : value,
                              })}
                            />
                            <div className="mt-1 text-left">
                              <span className="text-xs text-neutral-400">
                                {name?.length || 0}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-sm font-medium text-neutral-800">
                        Description
                        <span className="ml-1 font-normal text-neutral-500">
                          (optional)
                        </span>
                      </label>
                      <div className="mt-2">
                        <Controller
                          control={control}
                          name="description"
                          render={({ field }) => (
                            <RichTextProvider
                              features={["bold", "italic", "links"]}
                              markdown
                              placeholder="Provide any bounty requirements to the partner"
                              editorClassName="block max-h-48 overflow-auto scrollbar-hide w-full resize-none border-none p-3 text-base sm:text-sm"
                              initialValue={field.value}
                              onChange={(editor: any) =>
                                field.onChange(editor.getMarkdown() || null)
                              }
                            >
                              <div
                                className={cn(
                                  "overflow-hidden rounded-md border border-neutral-300 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500",
                                  errors.description &&
                                    "border-red-600 focus-within:border-red-500 focus-within:ring-red-600",
                                )}
                              >
                                <div className="flex flex-col">
                                  <RichTextArea />
                                  <RichTextToolbar className="px-1 pb-1" />
                                </div>
                              </div>
                            </RichTextProvider>
                          )}
                        />

                        <div className="mt-1 text-left">
                          <MaxCharactersCounter
                            name="description"
                            control={control}
                            maxLength={BOUNTY_DESCRIPTION_MAX_LENGTH}
                            spaced
                            className="text-content-muted"
                          />
                        </div>
                      </div>
                    </div>

                    <AnimatedSizeContainer
                      height
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                      style={{
                        height: hasStartDate ? "auto" : "0px",
                        overflow: "hidden",
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          fn={handleStartDateToggle}
                          checked={hasStartDate}
                          trackDimensions="w-8 h-4"
                          thumbDimensions="w-3 h-3"
                          thumbTranslate="translate-x-4"
                          disabled={Boolean(bounty?.startsAt)}
                        />
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-medium text-neutral-700">
                            Start date
                          </h3>
                        </div>
                      </div>

                      {hasStartDate && (
                        <div className="mt-3 p-px">
                          <Controller
                            control={control}
                            name="startsAt"
                            render={({ field }) => (
                              <SmartDateTimePicker
                                value={field.value}
                                onChange={(date) =>
                                  field.onChange(date ?? undefined)
                                }
                                placeholder='E.g. "2026-02-28", "Last Thursday", "2 hours ago"'
                              />
                            )}
                          />
                        </div>
                      )}
                    </AnimatedSizeContainer>

                    {type === "performance" && (
                      <AnimatedSizeContainer
                        height
                        transition={{ ease: "easeInOut", duration: 0.2 }}
                        style={{
                          height: hasEndDate ? "auto" : "0px",
                          overflow: "hidden",
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <Switch
                            fn={handleEndDateToggle}
                            checked={hasEndDate}
                            trackDimensions="w-8 h-4"
                            thumbDimensions="w-3 h-3"
                            thumbTranslate="translate-x-4"
                            disabled={Boolean(bounty?.endsAt)}
                          />
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-medium text-neutral-700">
                              End date
                            </h3>
                          </div>
                        </div>

                        {hasEndDate && (
                          <div className="mt-3 p-px">
                            <Controller
                              control={control}
                              name="endsAt"
                              render={({ field }) => (
                                <SmartDateTimePicker
                                  value={field.value}
                                  onChange={(date) =>
                                    handleEndDateChange(date ?? null)
                                  }
                                  placeholder='E.g. "2026-12-01", "Next Thursday", "After 10 days"'
                                />
                              )}
                            />
                          </div>
                        )}
                      </AnimatedSizeContainer>
                    )}

                    {type === "submission" && (
                      <AnimatedSizeContainer
                        height
                        transition={{ ease: "easeInOut", duration: 0.2 }}
                        style={{
                          height: hasEndDate ? "auto" : "0px",
                          overflow: "hidden",
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <Switch
                            fn={handleEndDateToggle}
                            checked={hasEndDate}
                            trackDimensions="w-8 h-4"
                            thumbDimensions="w-3 h-3"
                            thumbTranslate="translate-x-4"
                            disabled={Boolean(bounty?.endsAt)}
                          />
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-medium text-neutral-700">
                              End date
                            </h3>
                          </div>
                        </div>

                        {hasEndDate && (
                          <div className="mt-3 p-px">
                            <Controller
                              control={control}
                              name="endsAt"
                              render={({ field }) => (
                                <SmartDateTimePicker
                                  value={field.value}
                                  onChange={(date) =>
                                    handleEndDateChange(date ?? null)
                                  }
                                  placeholder='E.g. "2026-12-01", "Next Thursday", "After 10 days"'
                                />
                              )}
                            />
                          </div>
                        )}
                      </AnimatedSizeContainer>
                    )}

                    {type === "submission" && (
                      <>
                        <div>
                          <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-medium text-neutral-700">
                              Allowed submissions
                            </h3>
                          </div>

                          <div className="mt-1 space-y-2">
                            <NumberStepper
                              value={allowedSubmissions}
                              onChange={handleAllowedSubmissionsChange}
                              min={1}
                              max={maxAllowedSubmissions}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <AnimatedSizeContainer
                          height
                          transition={{ ease: "easeInOut", duration: 0.2 }}
                        >
                          {hasEndDate && (
                            <div>
                              <Tooltip
                                content={
                                  allowedSubmissions > 1
                                    ? "Decrease allowed submissions to 1 to use submission window."
                                    : undefined
                                }
                              >
                                <div
                                  className={cn(
                                    "flex items-center gap-4 transition-opacity",
                                    allowedSubmissions > 1 && "opacity-30",
                                  )}
                                >
                                  <Switch
                                    fn={handleSubmissionWindowToggle}
                                    checked={submissionWindow != null}
                                    trackDimensions="w-8 h-4"
                                    thumbDimensions="w-3 h-3"
                                    thumbTranslate="translate-x-4"
                                    disabled={allowedSubmissions > 1}
                                  />
                                  <div className="flex flex-col gap-1">
                                    <h3 className="text-sm font-medium text-neutral-700">
                                      Submission window
                                    </h3>
                                  </div>
                                </div>
                              </Tooltip>

                              {submissionWindow != null && (
                                <div className="mt-3 space-y-2">
                                  <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-2.5 shadow-sm">
                                    <div className="flex items-center gap-2.5">
                                      <RewardIconSquare icon={CalendarIcon} />
                                      <span className="text-content-default text-sm leading-relaxed">
                                        Partners can submit{" "}
                                        <SubmissionWindowBadge
                                          value={submissionWindow}
                                          onChange={
                                            handleSubmissionWindowChange
                                          }
                                        />{" "}
                                        days before the end date
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </AnimatedSizeContainer>

                        <div>
                          <Tooltip
                            content={
                              allowedSubmissions === 1
                                ? "Increase allowed submissions to 2 or more to use submission frequency."
                                : undefined
                            }
                          >
                            <div
                              className={cn(
                                "flex items-center gap-4 transition-opacity",
                                allowedSubmissions === 1 && "opacity-30",
                              )}
                            >
                              <Switch
                                fn={handleSubmissionFrequencyToggle}
                                checked={submissionFrequency != null}
                                trackDimensions="w-8 h-4"
                                thumbDimensions="w-3 h-3"
                                thumbTranslate="translate-x-4"
                                disabled={allowedSubmissions === 1}
                              />
                              <div className="flex flex-col gap-1">
                                <h3 className="text-sm font-medium text-neutral-700">
                                  Submission frequency
                                </h3>
                              </div>
                            </div>
                          </Tooltip>

                          {submissionFrequency != null && (
                            <div className="mt-3 space-y-2">
                              <Combobox
                                selected={
                                  SUBMISSION_FREQUENCY_OPTIONS.find(
                                    (option) =>
                                      option.value === submissionFrequency,
                                  ) ?? null
                                }
                                setSelected={(option) =>
                                  handleSubmissionFrequencyChange(
                                    option?.value as BountySubmissionFrequency,
                                  )
                                }
                                options={
                                  SUBMISSION_FREQUENCY_OPTIONS as unknown as ComboboxOption<BountySubmissionFrequency>[]
                                }
                                caret
                                matchTriggerWidth
                                hideSearch
                                buttonProps={{
                                  className: cn(
                                    "w-full justify-start border-neutral-300 px-3",
                                    "data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500",
                                    "focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 focus:border-[var(--brand)] focus:ring-[var(--brand)] transition-none",
                                  ),
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>

              <BountyCriteria />

              <ProgramSheetAccordionItem value="groups">
                <ProgramSheetAccordionTrigger>
                  Groups
                </ProgramSheetAccordionTrigger>
                <ProgramSheetAccordionContent>
                  <Controller
                    control={control}
                    name="groupIds"
                    render={({ field }) => (
                      <GroupsMultiSelect
                        selectedGroupIds={field.value}
                        setSelectedGroupIds={(ids) => field.onChange(ids)}
                      />
                    )}
                  />
                </ProgramSheetAccordionContent>
              </ProgramSheetAccordionItem>
            </ProgramSheetAccordion>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white">
          <div className="flex items-center justify-end gap-2 p-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              text="Cancel"
              className="h-9 w-fit"
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="primary"
              text={bounty ? "Update bounty" : "Create bounty"}
              className="h-9 w-fit"
              loading={isSubmitting}
              disabled={Boolean(validationError) || (bounty && !isDirty)}
              disabledTooltip={
                showBountySocialMetricsUpsell ? (
                  <TooltipContent
                    title="[Social metrics bounties](https://dub.co/help/article/program-bounties#social-metrics-bounties) are only available on the Advanced plan and above."
                    cta="Upgrade to Advanced"
                    href={`/${workspaceSlug}/upgrade?showPartnersUpgradeModal=true`}
                    target="_blank"
                  />
                ) : (
                  validationError ||
                  (bounty && !isDirty ? "No changes to save" : undefined)
                )
              }
            />
          </div>
        </div>
      </FormProvider>
      {!bounty && confirmCreateBountyModal}
    </form>
  );
}

function SubmissionWindowBadge({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <InlineBadgePopover
      text={
        value != null && !isNaN(value) ? String(value) : "Submission window"
      }
      invalid={value == null || isNaN(value)}
    >
      <InlineBadgePopoverInput
        type="number"
        min={1}
        value={value == null || value === 0 ? "" : String(value)}
        onChange={(e) => {
          const raw = (e.target as HTMLInputElement).value;

          if (raw === "") {
            onChange(undefined);
            return;
          }

          const num = parseInt(raw, 10);

          onChange(Number.isNaN(num) ? undefined : Math.max(1, num));
        }}
        placeholder="days"
      />
    </InlineBadgePopover>
  );
}

export function BountySheet({
  isOpen,
  nested,
  ...rest
}: BountySheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  const { queryParams } = useRouterStuff();

  return (
    <Sheet
      open={isOpen}
      onOpenChange={rest.setIsOpen}
      onClose={() => queryParams({ del: "bountyId", scroll: false })}
      nested={nested}
    >
      <BountySheetContent {...rest} />
    </Sheet>
  );
}

export function useBountySheet(
  props: { nested?: boolean } & Omit<BountySheetProps, "setIsOpen"> = {},
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    BountySheet: (
      <BountySheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setShowCreateBountySheet: setIsOpen,
  };
}
