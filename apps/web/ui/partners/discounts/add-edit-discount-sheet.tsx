"use client";

import { createDiscountAction } from "@/lib/actions/partners/create-discount";
import { deleteDiscountAction } from "@/lib/actions/partners/delete-discount";
import { updateDiscountAction } from "@/lib/actions/partners/update-discount";
import { constructRewardAmount } from "@/lib/api/sales/construct-reward-amount";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import useGroup from "@/lib/swr/use-group";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscountProps } from "@/lib/types";
import { createDiscountSchema } from "@/lib/zod/schemas/discount";
import { RECURRING_MAX_DURATIONS } from "@/lib/zod/schemas/misc";
import { Stripe } from "@/ui/guides/icons/stripe";
import { X } from "@/ui/shared/icons";
import {
  InlineBadgePopover,
  InlineBadgePopoverMenu,
} from "@/ui/shared/inline-badge-popover";
import { UpgradeRequiredToast } from "@/ui/shared/upgrade-required-toast";
import {
  Button,
  InfoTooltip,
  Sheet,
  SimpleTooltipContent,
  Switch,
} from "@dub/ui";
import { CircleCheckFill, Tag } from "@dub/ui/icons";
import { capitalize, cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useRef,
  useState,
} from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { z } from "zod";
import { RewardDiscountPartnersCard } from "../groups/reward-discount-partners-card";

interface DiscountSheetProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  discount?: DiscountProps;
  defaultDiscountValues?: DiscountProps;
}

type FormData = z.infer<typeof createDiscountSchema>;

export const useAddEditDiscountForm = () => useFormContext<FormData>();

const COUPON_CREATION_OPTIONS = [
  {
    label: "New Stripe coupon",
    description: "Create a new coupon",
    useExisting: false,
  },
  {
    label: "Use Stripe coupon ID",
    description: "Use an existing coupon",
    useExisting: true,
  },
] as const;

function DiscountSheetContent({
  setIsOpen,
  discount,
  defaultDiscountValues,
}: DiscountSheetProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const { group, mutateGroup } = useGroup();
  const { mutate: mutateProgram } = useProgram();
  const { id: workspaceId, defaultProgramId, stripeConnectId } = useWorkspace();

  const [useExistingCoupon, setUseExistingCoupon] = useState(false);

  const [useStripeTestCouponId, setUseStripeTestCouponId] = useState(
    Boolean(discount?.couponTestId),
  );

  const defaultValuesSource = discount ||
    defaultDiscountValues || {
      amount: 10,
      type: "percentage",
      maxDuration: 6,
      couponId: "",
      couponTestId: "",
    }; // default is 10% for 6 months

  const form = useForm<FormData>({
    defaultValues: {
      amount:
        defaultValuesSource.type === "flat"
          ? defaultValuesSource.amount / 100
          : defaultValuesSource.amount,
      type: defaultValuesSource.type,
      maxDuration:
        defaultValuesSource.maxDuration === null
          ? Infinity
          : defaultValuesSource.maxDuration,
      couponId: defaultValuesSource.couponId || "",
      couponTestId: defaultValuesSource.couponTestId,
    },
  });

  const { handleSubmit, watch, setValue, register } = form;
  const [type, amount, maxDuration] = watch(["type", "amount", "maxDuration"]);

  const { executeAsync: createDiscount, isPending: isCreating } = useAction(
    createDiscountAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Discount created!");
        await mutateProgram();
        await mutateGroup();
      },
      onError({ error }) {
        const stripeErrorMap: Record<
          string,
          { title: string; ctaLabel: string; ctaUrl: string }
        > = {
          STRIPE_CONNECTION_REQUIRED: {
            title: "Stripe connection required",
            ctaLabel: "Install Stripe app",
            ctaUrl: "https://marketplace.stripe.com/apps/dub-conversions",
          },
          STRIPE_APP_UPGRADE_REQUIRED: {
            title: "Stripe app upgrade required",
            ctaLabel: "Review permissions",
            ctaUrl: "https://marketplace.stripe.com/apps/dub-conversions",
          },
        };

        if (error.serverError) {
          const code = Object.keys(stripeErrorMap).find((key) =>
            error.serverError!.startsWith(key),
          );

          if (code) {
            const { title, ctaLabel, ctaUrl } = stripeErrorMap[code];
            const message = error.serverError!.replace(`${code}: `, "");

            toast.custom(() => (
              <UpgradeRequiredToast
                title={title}
                message={message}
                ctaLabel={ctaLabel}
                ctaUrl={ctaUrl}
              />
            ));
            return;
          }
        }

        toast.error(error.serverError);
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
        await mutateGroup();
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const { executeAsync: deleteDiscount, isPending: isDeleting } = useAction(
    deleteDiscountAction,
    {
      onSuccess: async () => {
        setIsOpen(false);
        toast.success("Discount deleted!");
        await mutate(`/api/programs/${defaultProgramId}`);
        await mutateGroup();
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

  const onSubmit = async (data: FormData) => {
    if (!workspaceId || !defaultProgramId || !group) {
      return;
    }

    if (discount) {
      await updateDiscount({
        workspaceId,
        discountId: discount.id,
        couponTestId: data.couponTestId,
      });
      return;
    }

    await createDiscount({
      ...data,
      workspaceId,
      groupId: group.id,
      amount: data.type === "flat" ? data.amount * 100 : data.amount || 0,
      maxDuration:
        Number(data.maxDuration) === Infinity ? null : data.maxDuration,
    });
  };

  const onDelete = async () => {
    if (!workspaceId || !defaultProgramId || !discount) {
      return;
    }

    if (!confirm("Are you sure you want to delete this discount?")) {
      return;
    }

    await deleteDiscount({
      workspaceId,
      discountId: discount.id,
    });
  };

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        onSubmit={handleSubmit(onSubmit)}
        className="flex h-full flex-col"
      >
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-6 py-4">
          <Sheet.Title className="text-lg font-semibold">
            {discount ? "Edit" : "Create"} discount
          </Sheet.Title>
          <Sheet.Close asChild>
            <Button
              variant="outline"
              icon={<X className="size-5" />}
              className="h-auto w-fit p-1"
            />
          </Sheet.Close>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <DiscountSheetCard
            title={
              <>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-neutral-100">
                  <Tag className="size-4 text-neutral-800" />
                </div>
                <span className="leading-relaxed">Coupon connection</span>
              </>
            }
            content={
              <div className="border-border-subtle -mx-px rounded-xl border-x border-t bg-neutral-100 p-2.5">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-content-emphasis text-sm font-medium">
                      Payment provider
                    </label>
                    <div className="">
                      <select className="block w-full rounded-md border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500">
                        <option value="stripe">Stripe</option>
                      </select>
                    </div>
                  </div>

                  {!discount && (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {COUPON_CREATION_OPTIONS.map(
                        ({ label, description, useExisting }) => {
                          const isSelected = useExistingCoupon === useExisting;

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
                                    setUseExistingCoupon(useExisting);
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
                  )}

                  {(useExistingCoupon || discount) && (
                    <>
                      <div>
                        <label
                          htmlFor="couponId"
                          className="flex items-center space-x-2"
                        >
                          <h2 className="text-sm font-medium text-neutral-900">
                            Stripe coupon ID
                          </h2>
                        </label>
                        <div className="mt-2">
                          <input
                            type="text"
                            id="couponId"
                            className="border-border-subtle block w-full rounded-lg bg-white px-3 py-2 text-neutral-800 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                            {...register("couponId")}
                            placeholder="XZuejd0Q"
                            disabled={!!discount} // we don't allow updating the coupon ID for existing discounts
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Switch
                          fn={() => {
                            setUseStripeTestCouponId(!useStripeTestCouponId);
                            setValue("couponTestId", "");
                          }}
                          checked={useStripeTestCouponId}
                          trackDimensions="w-8 h-4"
                          thumbDimensions="w-3 h-3"
                          thumbTranslate="translate-x-4"
                        />
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-neutral-800">
                            Use Stripe test coupon ID
                          </h3>

                          <InfoTooltip
                            content={
                              <SimpleTooltipContent title="Enabling this will allow you to test your coupon code before going live by entering your Stripe test coupon ID." />
                            }
                          />
                        </div>
                      </div>

                      {useStripeTestCouponId && (
                        <div>
                          <label
                            htmlFor="couponTestId"
                            className="flex items-center space-x-2"
                          >
                            <h2 className="text-sm font-medium text-neutral-900">
                              Stripe test coupon ID
                            </h2>
                          </label>
                          <div className="mt-2">
                            <input
                              type="text"
                              id="couponTestId"
                              className="border-border-subtle block w-full rounded-lg px-3 py-2 text-neutral-800 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                              {...register("couponTestId")}
                              placeholder="2NMXz81x"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            }
          />

          <VerticalLine />

          <DiscountSheetCard
            className={cn(
              discount && "pointer-events-none cursor-not-allowed select-none",
            )}
            title={
              <>
                <Stripe className="size-7" />
                <span className="leading-relaxed">
                  Discount a{" "}
                  <InlineBadgePopover
                    text={capitalize(type)}
                    disabled={!!discount}
                  >
                    <InlineBadgePopoverMenu
                      selectedValue={type}
                      onSelect={(value) =>
                        setValue("type", value as "flat" | "percentage", {
                          shouldDirty: true,
                        })
                      }
                      items={[
                        {
                          text: "Flat",
                          value: "flat",
                        },
                        {
                          text: "Percentage",
                          value: "percentage",
                        },
                      ]}
                    />
                  </InlineBadgePopover>{" "}
                  {type === "percentage" && "of "}
                  <InlineBadgePopover
                    text={
                      amount
                        ? constructRewardAmount({
                            amount: type === "flat" ? amount * 100 : amount,
                            type,
                          })
                        : "amount"
                    }
                    invalid={!amount}
                    disabled={!!discount}
                  >
                    <AmountInput disabled={!!discount} />
                  </InlineBadgePopover>{" "}
                  <InlineBadgePopover
                    text={
                      maxDuration === 0
                        ? "one time"
                        : maxDuration === Infinity
                          ? "for the customer's lifetime"
                          : `for ${maxDuration} ${pluralize("month", Number(maxDuration))}`
                    }
                    disabled={!!discount}
                  >
                    <InlineBadgePopoverMenu
                      selectedValue={maxDuration?.toString()}
                      onSelect={(value) =>
                        setValue("maxDuration", Number(value), {
                          shouldDirty: true,
                        })
                      }
                      items={[
                        {
                          text: "one time",
                          value: "0",
                        },
                        ...RECURRING_MAX_DURATIONS.filter((v) => v !== 0).map(
                          (v) => ({
                            text: `for ${v} ${pluralize("month", Number(v))}`,
                            value: v.toString(),
                          }),
                        ),
                        {
                          text: "for the customer's lifetime",
                          value: "Infinity",
                        },
                      ]}
                    />
                  </InlineBadgePopover>
                </span>
              </>
            }
            content={<></>}
          />

          <VerticalLine />

          {group && <RewardDiscountPartnersCard groupId={group.id} />}
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
              disabled={isCreating || isDeleting || isUpdating}
            />

            <Button
              type="submit"
              variant="primary"
              text={discount ? "Update discount" : "Create discount"}
              className="w-fit"
              loading={isCreating || isUpdating}
              disabled={(!discount && amount == null) || isDeleting}
            />
          </div>
        </div>
      </form>
    </FormProvider>
  );
}

function DiscountSheetCard({
  title,
  content,
  className,
}: PropsWithChildren<{
  title: ReactNode;
  content: ReactNode;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        "border-border-subtle rounded-xl border bg-white text-sm shadow-sm",
        className,
      )}
    >
      <div className="text-content-emphasis flex items-center gap-2.5 p-2.5 font-medium">
        {title}
      </div>
      {content && <>{content}</>}
    </div>
  );
}

const VerticalLine = () => (
  <div className="bg-border-subtle ml-6 h-4 w-px shrink-0" />
);

function AmountInput({ disabled }: { disabled?: boolean }) {
  const { watch, register } = useAddEditDiscountForm();
  const type = watch("type");

  return (
    <div className="relative rounded-md shadow-sm">
      {type === "flat" && (
        <span className="absolute inset-y-0 left-0 flex items-center pl-1.5 text-sm text-neutral-400">
          $
        </span>
      )}
      <input
        className={cn(
          "block w-full rounded-md border-neutral-300 px-1.5 py-1 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          type === "flat" ? "pl-4 pr-12" : "pr-7",
        )}
        disabled={disabled}
        {...register("amount", {
          required: true,
          setValueAs: (value: string) => (value === "" ? undefined : +value),
          min: 0,
          max: type === "percentage" ? 100 : undefined,
          onChange: handleMoneyInputChange,
        })}
        onKeyDown={handleMoneyKeyDown}
      />
      <span className="absolute inset-y-0 right-0 flex items-center pr-1.5 text-sm text-neutral-400">
        {type === "flat" ? "USD" : "%"}
      </span>
    </div>
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
