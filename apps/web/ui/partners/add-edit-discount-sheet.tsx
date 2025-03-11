"use client";

import { createDiscountAction } from "@/lib/actions/partners/create-discount";
import { deleteDiscountAction } from "@/lib/actions/partners/delete-discount";
import { updateDiscountAction } from "@/lib/actions/partners/update-discount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useDiscountPartners from "@/lib/swr/use-discount-partners";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscountProps, EnrolledPartnerProps } from "@/lib/types";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import { SelectEligiblePartnersSheet } from "@/ui/partners/select-eligible-partners-sheet";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  CircleCheckFill,
  Sheet,
  usePagination,
} from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { PartnersTable } from "./reward-discount-partners-table";

interface DiscountSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  discount?: DiscountProps;
  isDefault?: boolean;
}

type FormData = z.infer<typeof createDiscountSchema>;

const discountTypes = [
  {
    label: "One-off",
    description: "Offer a one-time discount",
    recurring: false,
  },
  {
    label: "Recurring",
    description: "Offer an ongoing discount",
    recurring: true,
  },
] as const;

function DiscountSheetContent({
  setIsOpen,
  discount,
  isDefault,
}: DiscountSheetProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const { id: workspaceId } = useWorkspace();
  const { program, mutate: mutateProgram } = useProgram();
  const [isAddPartnersOpen, setIsAddPartnersOpen] = useState(false);

  const [isRecurring, setIsRecurring] = useState(
    discount ? discount.maxDuration !== 0 : false,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      ...(discount && {
        amount: discount.amount
          ? discount.type === "flat"
            ? discount.amount / 100
            : discount.amount
          : 0,
        type: discount.type || "flat",
        maxDuration:
          discount?.maxDuration === null
            ? Infinity
            : discount?.maxDuration || 0,
        couponId: discount.couponId || "",
        couponTestId: discount.couponTestId || "",
      }),
    },
  });

  // Manage discount partners
  const { pagination, setPagination } = usePagination(25);
  const [selectedPartners, setSelectedPartners] =
    useState<EnrolledPartnerProps[]>();

  const { data: discountPartners, loading: discountPartnersLoading } =
    useDiscountPartners({
      query: {
        discountId: discount?.id,
        pageSize: pagination.pageSize,
        page: pagination.pageIndex || 1,
      },
      enabled: Boolean(discount && program),
    });

  useEffect(() => {
    if (discountPartners) {
      setSelectedPartners(discountPartners);
    }
  }, [discountPartners]);

  useEffect(() => {
    if (selectedPartners) {
      setValue(
        "partnerIds",
        selectedPartners.map((partner) => partner.id),
      );
    }
  }, [selectedPartners, setValue]);

  const [type, partnerIds = []] = watch(["type", "partnerIds"]);

  const { executeAsync: createDiscount, isPending: isCreating } = useAction(
    createDiscountAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Discount created!");
        await mutateProgram();
        await mutatePrefix(`/api/programs/${program?.id}/discounts`);
      },
      onError({ error }) {
        toast.error(error.serverError);
        console.error(error);
      },
    },
  );

  const { executeAsync: updateDiscount, isPending: isUpdating } = useAction(
    updateDiscountAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Discount updated!");
        await mutateProgram();
        await mutatePrefix(`/api/programs/${program?.id}/discounts`);
      },
      onError({ error }) {
        toast.error(error.serverError);
        console.error(error);
      },
    },
  );

  const { executeAsync: deleteDiscount, isPending: isDeleting } = useAction(
    deleteDiscountAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Discount deleted!");
        await mutate(`/api/programs/${program?.id}`);
        await mutatePrefix(`/api/programs/${program?.id}/discounts`);
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !program) {
      return;
    }

    const payload = {
      ...data,
      workspaceId,
      programId: program.id,
      amount: data.type === "flat" ? data.amount * 100 : data.amount || 0,
      maxDuration:
        Number(data.maxDuration) === Infinity ? null : data.maxDuration,
    };

    if (!discount) {
      console.log("payload", payload);
      await createDiscount(payload);
    } else {
      await updateDiscount({
        ...payload,
        discountId: discount.id,
      });
    }
  };

  const onDelete = async () => {
    if (!workspaceId || !program || !discount) {
      return;
    }

    if (!confirm("Are you sure you want to delete this discount?")) {
      return;
    }

    await deleteDiscount({
      workspaceId,
      programId: program.id,
      discountId: discount.id,
    });
  };

  const buttonDisabled =
    isCreating ||
    isUpdating ||
    (!isDefault && (!partnerIds || partnerIds.length === 0));

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col"
      >
        <div className="flex items-start justify-between border-b border-neutral-200 p-6">
          <Sheet.Title className="text-xl font-semibold">
            {discount ? "Edit" : "Create"} {isDefault ? "default" : ""} discount
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-6">
            <div>
              <div className="-m-1">
                <AnimatedSizeContainer
                  height
                  transition={{ ease: "easeInOut", duration: 0.2 }}
                >
                  <div className="p-1">
                    <div
                      className={cn(
                        "space-y-4 transition-opacity duration-200",
                      )}
                      aria-hidden={!isRecurring}
                      {...{
                        inert: !isRecurring,
                      }}
                    >
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {discountTypes.map(
                          ({ label, description, recurring }) => {
                            const isSelected = isRecurring === recurring;

                            return (
                              <label
                                key={label}
                                className={cn(
                                  "relative flex w-full cursor-pointer items-start gap-0.5 rounded-md border border-neutral-200 bg-white p-3 text-neutral-600 hover:bg-neutral-50",
                                  "transition-all duration-150",
                                  isSelected &&
                                    "border-black bg-neutral-50 text-neutral-900 ring-1 ring-black",
                                )}
                              >
                                <input
                                  type="radio"
                                  value={label}
                                  className="hidden"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setIsRecurring(recurring);
                                      setValue(
                                        "maxDuration",
                                        recurring
                                          ? discount?.maxDuration || 3
                                          : 0,
                                      );
                                    }
                                  }}
                                />
                                <div className="flex grow flex-col text-sm">
                                  <span className="font-medium">{label}</span>
                                  <span>{description}</span>
                                </div>
                                <CircleCheckFill
                                  className={cn(
                                    "-mr-px -mt-px flex size-4 scale-75 items-center justify-center rounded-full opacity-0 transition-[transform,opacity] duration-150",
                                    isSelected && "scale-100 opacity-100",
                                  )}
                                />
                              </label>
                            );
                          },
                        )}
                      </div>

                      {isRecurring && (
                        <div className="space-y-4">
                          <div>
                            <label
                              htmlFor="duration"
                              className="text-sm font-medium text-neutral-800"
                            >
                              Duration
                            </label>
                            <div className="relative mt-2 rounded-md shadow-sm">
                              <select
                                className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                                {...register("maxDuration", {
                                  valueAsNumber: true,
                                })}
                              >
                                {RECURRING_MAX_DURATIONS.filter(
                                  (v) => v !== 0,
                                ).map((v) => (
                                  <option value={v} key={v}>
                                    {v} {pluralize("month", Number(v))}
                                  </option>
                                ))}
                                <option value={Infinity}>Lifetime</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="type"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Discount model
                        </label>
                        <div className="relative mt-2 rounded-md shadow-sm">
                          <select
                            className="block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                            {...register("type")}
                          >
                            <option value="percentage">Percentage</option>
                            <option value="flat">Flat</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="amount"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Amount
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
                              valueAsNumber: true,
                              min: 0,
                              max: 100,
                              onChange: handleMoneyInputChange,
                              required: true,
                            })}
                            onKeyDown={handleMoneyKeyDown}
                            placeholder={"0"}
                          />
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                            {type === "flat" ? "USD" : "%"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="couponId"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Stripe coupon ID
                        </label>
                        <div className="relative mt-2 rounded-md shadow-sm">
                          <input
                            className={cn(
                              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              errors.couponId &&
                                "border-red-600 pr-7 focus:border-red-500 focus:ring-red-600",
                            )}
                            {...register("couponId", {
                              required: true,
                            })}
                            placeholder="XZuejd0Q"
                          />
                        </div>

                        <p className="mt-1 text-xs text-neutral-500">
                          Learn more about{" "}
                          <a
                            href="https://docs.stripe.com/billing/subscriptions/coupons"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            Stripe coupon codes here
                          </a>
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="couponTestId"
                          className="text-sm font-medium text-neutral-800"
                        >
                          Stripe test coupon ID (optional)
                        </label>
                        <div className="relative mt-2 rounded-md shadow-sm">
                          <input
                            className={cn(
                              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                            )}
                            {...register("couponTestId")}
                            placeholder="2NMXz81x"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSizeContainer>
              </div>
            </div>

            {!isDefault && (
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-neutral-800">
                    Eligible partners
                  </label>
                  <Button
                    text="Add partner"
                    className="h-7 w-fit"
                    onClick={() => setIsAddPartnersOpen(true)}
                  />
                </div>
                <div className="mt-4">
                  <PartnersTable
                    selectedPartners={selectedPartners || []}
                    setSelectedPartners={setSelectedPartners}
                    loading={discountPartnersLoading}
                    pagination={pagination}
                    setPagination={setPagination}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 p-5">
          <div>
            {discount && (
              <Button
                type="button"
                variant="outline"
                text="Remove discount"
                onClick={onDelete}
                loading={isDeleting}
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
              text="Cancel"
              className="w-fit"
              disabled={isCreating || isUpdating || isDeleting}
            />

            <Button
              type="submit"
              variant="primary"
              text={discount ? "Update discount" : "Create discount"}
              className="w-fit"
              loading={isCreating || isUpdating}
              disabled={buttonDisabled || isDeleting}
              disabledTooltip={
                !isDefault && (!partnerIds || partnerIds.length === 0)
                  ? "Please select at least one partner"
                  : undefined
              }
            />
          </div>
        </div>
      </form>

      <SelectEligiblePartnersSheet
        isOpen={isAddPartnersOpen}
        setIsOpen={setIsAddPartnersOpen}
        existingPartners={selectedPartners || []}
        onSelect={setSelectedPartners}
      />
    </>
  );
}

export function DiscountSheet({
  isOpen,
  nested,
  ...rest
}: DiscountSheetProps & {
  isOpen: boolean;
  nested?: boolean;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={rest.setIsOpen} nested={nested}>
      <DiscountSheetContent {...rest} />
    </Sheet>
  );
}

export function useDiscountSheet(
  props: { nested?: boolean } & Omit<DiscountSheetProps, "setIsOpen">,
) {
  const [isOpen, setIsOpen] = useState(false);

  return {
    DiscountSheet: (
      <DiscountSheet setIsOpen={setIsOpen} isOpen={isOpen} {...props} />
    ),
    setIsOpen,
  };
}
