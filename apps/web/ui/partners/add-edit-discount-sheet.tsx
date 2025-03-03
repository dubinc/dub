"use client";

import { createDiscountAction } from "@/lib/actions/partners/create-discount";
import { deleteDiscountAction } from "@/lib/actions/partners/delete-discount";
import { updateDiscountAction } from "@/lib/actions/partners/update-discount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useDiscountPartners from "@/lib/swr/use-discount-partners";
import useDiscounts from "@/lib/swr/use-discounts";
import usePartners from "@/lib/swr/use-partners";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscountProps, EnrolledPartnerProps } from "@/lib/types";
import {
  createRewardSchema,
  RECURRING_MAX_DURATIONS,
} from "@/lib/zod/schemas/rewards";
import { SelectEligiblePartnersSheet } from "@/ui/partners/select-eligible-partners-sheet";
import { X } from "@/ui/shared/icons";
import {
  AnimatedSizeContainer,
  Button,
  CircleCheckFill,
  LoadingSpinner,
  Sheet,
  Table,
  usePagination,
  Users,
  useTable,
} from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { DICEBEAR_AVATAR_URL } from "@dub/utils/src/constants";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";

interface DiscountSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  discount?: DiscountProps;
  isDefault?: boolean;
}

type FormData = z.infer<typeof createRewardSchema>;

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

  const { discounts } = useDiscounts();
  const { data: allPartners } = usePartners();
  const { id: workspaceId } = useWorkspace();
  const { program, mutate: mutateProgram } = useProgram();
  const { pagination, setPagination } = usePagination(25);
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
      maxDuration: discount
        ? discount.maxDuration === null
          ? Infinity
          : discount.maxDuration
        : 0,
      amount: discount?.amount,
      partnerIds: null,
    },
  });

  const [partnerIds = []] = watch(["partnerIds"]);

  const { data: discountPartners, loading: isLoadingDiscountPartners } =
    useDiscountPartners({
      query: {
        discountId: discount?.id,
        pageSize: pagination.pageSize,
        page: pagination.pageIndex || 1,
      },
      enabled: Boolean(discount && program),
    });

  const displayPartners = useMemo(() => {
    if (discount && discountPartners) {
      return discountPartners;
    }

    if (!allPartners) {
      return [];
    }

    return allPartners.filter((p) => partnerIds && partnerIds.includes(p.id));
  }, [discount, discountPartners, allPartners, partnerIds]);

  const partnersCount = discount?.partnersCount || 0;

  useEffect(() => {
    if (discountPartners) {
      setValue(
        "partnerIds",
        discountPartners.map((p) => p.id),
      );
    }
  }, [discountPartners, setValue]);

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
      maxDuration:
        Number(data.maxDuration) === Infinity ? null : data.maxDuration,
      workspaceId,
      programId: program.id,
    };

    if (!discount) {
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

  const [selectedPartners, setSelectedPartners] =
    useState<EnrolledPartnerProps[]>(displayPartners);

  useEffect(() => {
    setSelectedPartners(displayPartners);
  }, [displayPartners]);

  useEffect(() => {
    if (allPartners && partnerIds) {
      const newSelectedPartners = allPartners.filter((p) =>
        partnerIds.includes(p.id),
      );
      setSelectedPartners(newSelectedPartners);
    }
  }, [allPartners, partnerIds]);

  const selectedPartnersTable = useTable({
    data: selectedPartners,
    columns: [
      {
        header: "Partner",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <img
              src={
                row.original.image ||
                `${DICEBEAR_AVATAR_URL}${row.original.name}`
              }
              alt={row.original.name}
              className="size-6 rounded-full"
            />
            <span className="text-sm text-neutral-700">
              {row.original.name}
            </span>
          </div>
        ),
      },
      {
        header: "Email",
        cell: ({ row }) => (
          <div className="text-sm text-neutral-600">{row.original.email}</div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              icon={<X className="size-4" />}
              className="h-8 w-8 rounded-md border-0 bg-neutral-50 p-0"
              onClick={() => {
                const newPartnerIds = (partnerIds || []).filter(
                  (id) => id !== row.original.id,
                );
                setValue("partnerIds", newPartnerIds);
                setSelectedPartners((prev) =>
                  prev.filter((p) => p.id !== row.original.id),
                );
              }}
            />
          </div>
        ),
        size: 50,
      },
    ],
    thClassName: () => cn("border-l-0"),
    tdClassName: () => cn("border-l-0"),
    className: "[&_tr:last-child>td]:border-b-transparent",
    scrollWrapperClassName: "min-h-[40px]",
    resourceName: (p) => `eligible partner${p ? "s" : ""}`,
    pagination: discount ? pagination : undefined,
    onPaginationChange: discount ? setPagination : undefined,
    rowCount: discount ? partnersCount || 0 : selectedPartners.length,
  });

  const buttonDisabled =
    isCreating ||
    isUpdating ||
    (!isDefault && (!partnerIds || partnerIds.length === 0));

  const canDeleteDiscount =
    discount && program?.defaultDiscountId !== discount.id;

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
              {discount ? "Edit" : "Create"} {isDefault ? "default" : ""}{" "}
              discount
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
              <div className="-m-1">
                <AnimatedSizeContainer
                  height
                  transition={{ ease: "easeInOut", duration: 0.2 }}
                >
                  <div className="p-1">
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

                    <div
                      className={cn(
                        "transition-opacity duration-200",
                        isRecurring ? "h-auto" : "h-0 opacity-0",
                      )}
                      aria-hidden={!isRecurring}
                      {...{
                        inert: !isRecurring,
                      }}
                    >
                      <div className="pt-6">
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
                            {RECURRING_MAX_DURATIONS.filter((v) => v !== 0).map(
                              (v) => (
                                <option value={v} key={v}>
                                  {v} {pluralize("month", Number(v))}
                                </option>
                              ),
                            )}
                            <option value={Infinity}>Lifetime</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </AnimatedSizeContainer>
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
                <input
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.amount &&
                      "border-red-600 pr-7 focus:border-red-500 focus:ring-red-600",
                  )}
                  {...register("amount", {
                    required: true,
                    valueAsNumber: true,
                    min: 0,
                    max: 100,
                    onChange: handleMoneyInputChange,
                  })}
                  onKeyDown={handleMoneyKeyDown}
                  placeholder={"0"}
                />
                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                  %
                </span>
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
                  {isLoadingDiscountPartners ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner className="size-4" />
                    </div>
                  ) : displayPartners.length > 0 ? (
                    <Table {...selectedPartnersTable} />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-lg bg-neutral-50 py-12">
                      <div className="flex items-center justify-center">
                        <Users className="size-6 text-neutral-800" />
                      </div>
                      <div className="flex flex-col items-center gap-1 px-4 text-center">
                        <p className="text-base font-medium text-neutral-900">
                          Eligible partners
                        </p>
                        <p className="text-sm text-neutral-600">
                          No eligible partners added yet
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex grow flex-col justify-end">
          <div className="flex items-center justify-between border-t border-neutral-200 p-5">
            <div>
              {discount && (
                <Button
                  type="button"
                  variant="outline"
                  text="Remove discount"
                  onClick={onDelete}
                  loading={isDeleting}
                  disabled={!canDeleteDiscount}
                  disabledTooltip={
                    program?.defaultDiscountId === discount.id
                      ? "This is a default discount and cannot be deleted."
                      : undefined
                  }
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
        </div>
      </form>

      <SelectEligiblePartnersSheet
        isOpen={isAddPartnersOpen}
        setIsOpen={setIsAddPartnersOpen}
        selectedPartnerIds={watch("partnerIds") || []}
        onSelect={(ids) => {
          const existingIds = partnerIds || [];
          const newIds = ids.filter((id) => !existingIds.includes(id));
          const combinedIds = [...existingIds, ...newIds];
          setValue("partnerIds", combinedIds);
        }}
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
