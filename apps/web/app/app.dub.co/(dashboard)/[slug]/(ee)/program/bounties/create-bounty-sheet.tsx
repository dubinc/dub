import { handleMoneyKeyDown } from "@/lib/form-utils";
import useWorkspace from "@/lib/swr/use-workspace";
import { createBountySchema } from "@/lib/zod/schemas/bounties";
import {
  ProgramSheetAccordion,
  ProgramSheetAccordionContent,
  ProgramSheetAccordionItem,
  ProgramSheetAccordionTrigger,
} from "@/ui/partners/program-sheet-accordion";
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
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateBountySheetProps {
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

function CreateBountySheetContent({ setIsOpen }: CreateBountySheetProps) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const [hasEndDate, setHasEndDate] = useState(false);
  const [openAccordions, setOpenAccordions] = useState([
    "partner-and-type",
    "bounty-details",
  ]);

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
            <ProgramSheetAccordionItem value="partner-and-type">
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
                    <div className="relative mt-2 rounded-md shadow-sm">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                        $
                      </span>
                      <Controller
                        name="rewardAmount"
                        control={control}
                        rules={{
                          required: true,
                          min: 0,
                        }}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number"
                            className={cn(
                              "block w-full rounded-md border-neutral-300 pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              errors.rewardAmount &&
                                "border-red-600 focus:border-red-500 focus:ring-red-600",
                            )}
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
                            onKeyDown={handleMoneyKeyDown}
                            placeholder="200"
                          />
                        )}
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                        USD
                      </span>
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

export function CreateBountySheet({
  isOpen,
  nested,
  ...rest
}: CreateBountySheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <CreateBountySheetContent {...rest} />
    </Sheet>
  );
}

export function useCreateBountySheet(
  props: { nested?: boolean } & Omit<CreateBountySheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    createBountySheet: (
      <CreateBountySheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
