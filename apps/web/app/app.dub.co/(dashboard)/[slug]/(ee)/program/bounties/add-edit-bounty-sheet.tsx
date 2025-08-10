import useWorkspace from "@/lib/swr/use-workspace";
import { createBountySchema } from "@/lib/zod/schemas/bounties";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
import { AmountInput } from "@/ui/shared/amount-input";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  CardSelector,
  CardSelectorOption,
  Sheet,
  SmartDateTimePicker,
  Switch,
} from "@dub/ui";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface BountySheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  partnerId?: string;
}

type FormData = z.infer<typeof createBountySchema>;

const BOUNTY_TYPES: CardSelectorOption[] = [
  {
    key: "performance",
    label: "Performance-based",
    description: "Reward for reaching milestones",
  },
  {
    key: "submission",
    label: "Submission",
    description: "Reward for task completion",
  },
];

const ACCORDION_ITEMS = ["bounty-type", "bounty-details"];

function BountySheetContent({ setIsOpen }: BountySheetProps) {
  const [hasEndDate, setHasEndDate] = useState(false);
  const { id: workspaceId, defaultProgramId } = useWorkspace();
  const [openAccordions, setOpenAccordions] = useState(ACCORDION_ITEMS);

  const {
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: "performance",
    },
  });

  const [startsAt, endsAt, rewardAmount] = watch([
    "startsAt",
    "endsAt",
    "rewardAmount",
  ]);

  useEffect(() => {
    if (!hasEndDate) {
      setValue("endsAt", null);
    }
  }, [hasEndDate, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !defaultProgramId) {
      toast.error("Please fill all required fields.");
      return;
    }
  };

  const shouldDisableSubmit = useMemo(() => {
    //
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
        <div className="flex h-16 items-center justify-between px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            Create bounty
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

      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <ProgramSheetAccordion
            type="multiple"
            value={openAccordions}
            onValueChange={setOpenAccordions}
            className="space-y-6"
          >
            <ProgramSheetAccordionItem value="bounty-type">
              <ProgramSheetAccordionTrigger>
                Bounty type
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent>
                <div className="space-y-4">
                  <p className="text-sm text-neutral-600">
                    Set how the bounty will be completed
                  </p>
                  <CardSelector
                    options={BOUNTY_TYPES}
                    value={watch("type")}
                    onChange={(value: FormData["type"]) =>
                      setValue("type", value)
                    }
                    name="bounty-type"
                  />
                </div>
              </ProgramSheetAccordionContent>
            </ProgramSheetAccordionItem>

            <ProgramSheetAccordionItem value="bounty-details">
              <ProgramSheetAccordionTrigger>
                Bounty details
              </ProgramSheetAccordionTrigger>
              <ProgramSheetAccordionContent>
                <div className="space-y-6">
                  <p className="text-sm text-neutral-600">
                    Set the schedule, reward and additional details
                  </p>

                  <div>
                    <SmartDateTimePicker
                      value={startsAt}
                      onChange={(date) => {
                        setValue("startsAt", date as Date, {
                          shouldDirty: true,
                        });
                      }}
                      label="Start date"
                      placeholder='E.g. "2024-03-01", "Last Thursday", "2 hours ago"'
                    />
                  </div>

                  <AnimatedSizeContainer
                    height
                    transition={{ ease: "easeInOut", duration: 0.2 }}
                    className={!hasEndDate ? "hidden" : ""}
                    style={{ display: !hasEndDate ? "none" : "block" }}
                  >
                    <div className="flex items-center gap-4">
                      <Switch
                        fn={setHasEndDate}
                        checked={hasEndDate}
                        trackDimensions="w-8 h-4"
                        thumbDimensions="w-3 h-3"
                        thumbTranslate="translate-x-4"
                      />
                      <div className="flex flex-col gap-1">
                        <h3 className="text-sm font-medium text-neutral-700">
                          Add end date
                        </h3>
                      </div>
                    </div>

                    {hasEndDate && (
                      <div className="mt-6 p-px">
                        <SmartDateTimePicker
                          value={endsAt}
                          onChange={(date) => {
                            setValue("endsAt", date, {
                              shouldDirty: true,
                            });
                          }}
                          label="End date"
                          placeholder='E.g. "in 3 months"'
                        />
                      </div>
                    )}
                  </AnimatedSizeContainer>

                  <div>
                    <label
                      htmlFor="rewardAmount"
                      className="text-sm font-medium text-neutral-800"
                    >
                      Reward
                    </label>
                    <div className="mt-2">
                      <Controller
                        name="rewardAmount"
                        control={control}
                        rules={{
                          required: true,
                          min: 0,
                        }}
                        render={({ field }) => (
                          <AmountInput
                            {...field}
                            id="rewardAmount"
                            amountType="flat"
                            placeholder="200"
                            error={errors.rewardAmount?.message}
                            value={
                              field.value == null || isNaN(field.value)
                                ? ""
                                : field.value
                            }
                            onChange={(e) => {
                              const val = e.target.value;

                              field.onChange(
                                val === "" ? null : parseFloat(val),
                              );
                            }}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
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
            className="w-fit"
            // disabled={isPending}
          />

          <Button
            type="submit"
            variant="primary"
            text="Create bounty"
            className="w-fit"
            // loading={isPending}
            // disabled={shouldDisableSubmit}
          />
        </div>
      </div>
    </form>
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
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <BountySheetContent {...rest} />
    </Sheet>
  );
}

export function useBountySheet(
  props: { nested?: boolean } & Omit<BountySheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    BountySheet: (
      <BountySheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
