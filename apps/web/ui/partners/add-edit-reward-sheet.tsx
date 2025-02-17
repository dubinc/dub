"use client";

import { createRewardAction } from "@/lib/actions/partners/create-reward";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartners from "@/lib/swr/use-partners";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { createRewardSchema } from "@/lib/zod/schemas/rewards";
import { PartnerRowItem } from "@/ui/partners/partner-row-item";
import { SelectEligiblePartnersSheet } from "@/ui/partners/select-eligible-partners-sheet";
import { X } from "@/ui/shared/icons";
import { EventType } from "@dub/prisma/client";
import { Button, CircleCheckFill, Sheet } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// TODO:
// Can create 1 "all partner" reward
// Can create infinite "specific parter" rewards
// Partners can't be on more than one "specific reward"

interface RewardSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  event: EventType;
}

type FormData = z.infer<typeof createRewardSchema> & {
  partnerIds: string[];
};

const partnerTypes = [
  {
    key: "all",
    label: "All Partners",
    description: "Everyone is eligible",
  },
  {
    key: "specific",
    label: "Specific Partners",
    description: "Select who is eligible",
  },
] as const;

function RewardSheetContent({ setIsOpen, event }: RewardSheetProps) {
  const { program } = useProgram();
  const { data: partners } = usePartners();
  const { id: workspaceId } = useWorkspace();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedPartnerType, setSelectedPartnerType] =
    useState<(typeof partnerTypes)[number]["key"]>("all");
  const [isAddPartnersOpen, setIsAddPartnersOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: "flat",
      isDefault: false,
      maxDuration: null,
      partnerIds: [],
      event,
    },
  });

  const { executeAsync, isPending } = useAction(createRewardAction, {
    onSuccess: async (res) => {
      setIsOpen(false);
      toast.success("Successfully created reward!");
      await mutatePrefix(`/api/programs/${program?.id}/rewards`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      toast.error("Please fill all required fields");
      return;
    }

    await executeAsync({
      workspaceId,
      programId: program.id,
      ...data,
      amount: data.amount * 100,
    });
  };

  const [partnerIds = [], amount, type, isDefault] = watch([
    "partnerIds",
    "amount",
    "type",
    "isDefault",
  ]);

  const buttonDisabled = isPending || amount == null;

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col"
      >
        <div>
          <div className="flex items-start justify-between border-b border-neutral-200 p-6">
            <Sheet.Title className="text-xl font-semibold">
              {`Create ${event} reward`}
            </Sheet.Title>
            <Sheet.Close asChild>
              <Button
                variant="outline"
                icon={<X className="size-5" />}
                className="h-auto w-fit p-1"
              />
            </Sheet.Close>
          </div>
          <div className="flex flex-col gap-4 p-6">
            <div>
              <label
                htmlFor="amount"
                className="text-sm font-medium text-neutral-800"
              >
                {`Amount per ${event}`}
              </label>
              <div className="relative mt-2 rounded-md shadow-sm">
                {type === "flat" && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                    $
                  </span>
                )}
                <input
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.amount &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                    type === "flat" ? "pl-6 pr-12" : "pr-7",
                  )}
                  {...register("amount", {
                    required: true,
                    valueAsNumber: true,
                    min: 0,
                    max: type === "flat" ? 1000 : 100,
                  })}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                  {type === "flat" ? "USD" : "%"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {partnerTypes.map((partnerType) => {
                const isSelected = selectedPartnerType === partnerType.key;

                return (
                  <label
                    key={partnerType.label}
                    className={cn(
                      "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                      "transition-all duration-150",
                      isSelected &&
                        "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                    )}
                  >
                    <input
                      type="radio"
                      value={partnerType.label}
                      className="hidden"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPartnerType(partnerType.key);
                          if (partnerType.key === "all") {
                            setValue("partnerIds", []);
                          }
                        }
                      }}
                    />
                    <div className="flex grow flex-col text-sm">
                      <span className="font-medium">{partnerType.label}</span>
                      <span>{partnerType.description}</span>
                    </div>
                    <CircleCheckFill
                      className={cn(
                        "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                        isSelected && "scale-100 opacity-100",
                      )}
                    />
                  </label>
                );
              })}
            </div>

            {selectedPartnerType === "specific" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-800">
                    Eligible partners
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    text="Add partner"
                    className="h-8 w-fit"
                    onClick={() => setIsAddPartnersOpen(true)}
                  />
                </div>
                <div className="mt-2">
                  {partnerIds.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {partners
                        ?.filter((p) => partnerIds.includes(p.id))
                        .map((partner) => (
                          <div
                            key={partner.id}
                            className="flex items-center justify-between rounded-lg border border-neutral-200 p-3"
                          >
                            <PartnerRowItem partner={partner} />
                            <Button
                              type="button"
                              variant="secondary"
                              icon={<X className="size-4" />}
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setValue(
                                  "partnerIds",
                                  partnerIds.filter((id) => id !== partner.id),
                                );
                              }}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-neutral-200">
                      <p className="text-sm text-neutral-500">
                        No partners selected
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex grow flex-col justify-end">
          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 p-5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              text="Cancel"
              className="w-fit"
              disabled={isPending}
            />
            <Button
              type="submit"
              variant="primary"
              text="Create reward"
              className="w-fit"
              loading={isPending}
              disabled={buttonDisabled}
            />
          </div>
        </div>
      </form>

      <SelectEligiblePartnersSheet
        isOpen={isAddPartnersOpen}
        setIsOpen={setIsAddPartnersOpen}
        selectedPartnerIds={partnerIds}
        onSelect={(ids) => {
          setValue("partnerIds", ids);
        }}
      />
    </>
  );
}

export function RewardSheet({
  isOpen,
  nested,
  ...rest
}: RewardSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <RewardSheetContent {...rest} />
    </Sheet>
  );
}

export function useRewardSheet(
  props: { nested?: boolean } & Omit<RewardSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    rewardSheet: (
      <RewardSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
