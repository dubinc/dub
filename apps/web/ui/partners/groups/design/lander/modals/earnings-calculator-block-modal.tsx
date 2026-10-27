"use client";

import useGroup from "@/lib/swr/use-group";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import {
  AnimatedSizeContainer,
  Button,
  Modal,
  ToggleGroup,
  useMediaQuery,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Dispatch, SetStateAction, useId, useRef, useState } from "react";
import type { Control } from "react-hook-form";
import { Controller, useForm, useWatch } from "react-hook-form";
import * as z from "zod/v4";
import { EarningsCalculatorBlock } from "../../../../lander/blocks/earnings-calculator-block";

type EarningsCalculatorBlockData = z.infer<
  typeof programLanderEarningsCalculatorBlockSchema
>["data"];

type EarningsCalculatorBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<EarningsCalculatorBlockData>;
  onSubmit: (data: EarningsCalculatorBlockData) => void;
};

const MAX_PRODUCT_PRICE = 10_000;

export function EarningsCalculatorBlockModal(
  props: EarningsCalculatorBlockModalProps,
) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <EarningsCalculatorBlockModalInner {...props} />
    </Modal>
  );
}

function EarningsCalculatorBlockModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: EarningsCalculatorBlockModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();

  const { slug: workspaceSlug } = useWorkspace();

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(
    () => defaultValues?.minSales != null || defaultValues?.maxSales != null,
  );

  const {
    handleSubmit,
    register,
    control,
    formState: { errors },
  } = useForm<EarningsCalculatorBlockData>({
    defaultValues: {
      ...defaultValues,
      productPrice: defaultValues?.productPrice
        ? defaultValues.productPrice / 100
        : undefined,
      billingPeriod: defaultValues?.billingPeriod ?? "monthly",
      minSales: defaultValues?.minSales,
      maxSales: defaultValues?.maxSales,
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} earnings calculator
        </h3>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit({
                ...data,
                productPrice: Number(data.productPrice) * 100,
                minSales: data.minSales || undefined,
                maxSales: data.maxSales || undefined,
              });
            })(e);
          }}
        >
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide relative -m-2 max-h-[calc(100vh-160px)] overflow-y-auto p-2"
            >
              <div className="flex flex-col gap-5">
                {/* Product price */}
                <div>
                  <label
                    htmlFor={`${id}-price`}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-700"
                  >
                    Average product price
                  </label>
                  <div className="relative mt-2 rounded-md shadow-sm">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                      $
                    </span>
                    <input
                      id={`${id}-price`}
                      type="text"
                      placeholder="30"
                      autoFocus={!isMobile}
                      className={cn(
                        "block w-full rounded-md border-neutral-300 pl-6 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                        errors.productPrice &&
                          "border-red-600 focus:border-red-500 focus:ring-red-600",
                      )}
                      {...register("productPrice", {
                        required: true,
                        valueAsNumber: true,
                        min: 0,
                        max: MAX_PRODUCT_PRICE,
                      })}
                    />
                  </div>
                </div>

                {/* Billing period toggle */}
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    Billing period
                  </label>
                  <div className="mt-2">
                    <Controller
                      control={control}
                      name="billingPeriod"
                      render={({ field }) => (
                        <ToggleGroup
                          options={[
                            { value: "monthly", label: "Monthly" },
                            { value: "yearly", label: "Yearly" },
                            { value: "one-time", label: "One-time" },
                          ]}
                          selected={field.value ?? "monthly"}
                          selectAction={(value) => field.onChange(value)}
                          className="grid w-full grid-cols-3 rounded-lg border-none bg-neutral-100 p-0.5"
                          optionClassName="flex h-9 justify-center"
                          indicatorClassName="rounded-md border-none bg-white shadow-[0px_0px_2px_0px_rgba(0,0,0,0.05),0px_2px_6px_0px_rgba(0,0,0,0.1)]"
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2"
                    onClick={() =>
                      setShowAdvancedSettings(!showAdvancedSettings)
                    }
                  >
                    <p className="text-sm text-neutral-600">
                      {showAdvancedSettings ? "Hide" : "Show"} advanced settings
                    </p>
                    <motion.div
                      animate={{ rotate: showAdvancedSettings ? 180 : 0 }}
                      className="text-neutral-600"
                    >
                      <ChevronDown className="size-4" />
                    </motion.div>
                  </button>

                  <AnimatedSizeContainer height className="flex flex-col">
                    {showAdvancedSettings && (
                      <div className="mt-2">
                        <label className="text-sm font-medium text-neutral-700">
                          Sales range
                        </label>
                        <div className="mt-2 flex items-end gap-2">
                          <div
                            className={cn(
                              "border-subtle flex h-10 min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border bg-white",
                              "transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                              "focus-within:border-neutral-500 focus-within:ring-4 focus-within:ring-neutral-200",
                              errors.minSales &&
                                "border-red-600 focus-within:border-red-500 focus-within:ring-red-200",
                            )}
                          >
                            <input
                              id={`${id}-min-sales`}
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              aria-label="Minimum sales"
                              placeholder="No min"
                              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-1 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0"
                              {...register("minSales", {
                                setValueAs: (v) => {
                                  if (v === "" || v == null) return undefined;
                                  const n = Number.parseInt(
                                    String(v).replace(/\D/g, ""),
                                    10,
                                  );
                                  return Number.isFinite(n) ? n : undefined;
                                },
                                min: 1,
                                validate: (value, formValues) => {
                                  if (
                                    value == null ||
                                    formValues.maxSales == null
                                  ) {
                                    return true;
                                  }
                                  return (
                                    value <= formValues.maxSales ||
                                    "Must be less than or equal to max sales"
                                  );
                                },
                              })}
                            />
                          </div>

                          <span className="shrink-0 pb-2.5 text-xs text-neutral-500">
                            to
                          </span>

                          <div
                            className={cn(
                              "border-subtle flex h-10 min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border bg-white",
                              "transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
                              "focus-within:border-neutral-500 focus-within:ring-4 focus-within:ring-neutral-200",
                              errors.maxSales &&
                                "border-red-600 focus-within:border-red-500 focus-within:ring-red-200",
                            )}
                          >
                            <input
                              id={`${id}-max-sales`}
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              aria-label="Maximum sales"
                              placeholder="No max"
                              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-1 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0"
                              {...register("maxSales", {
                                setValueAs: (v) => {
                                  if (v === "" || v == null) return undefined;
                                  const n = Number.parseInt(
                                    String(v).replace(/\D/g, ""),
                                    10,
                                  );
                                  return Number.isFinite(n) ? n : undefined;
                                },
                                min: 1,
                                validate: (value, formValues) => {
                                  if (
                                    value == null ||
                                    formValues.minSales == null
                                  ) {
                                    return true;
                                  }
                                  return (
                                    value >= formValues.minSales ||
                                    "Must be greater than or equal to min sales"
                                  );
                                },
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </AnimatedSizeContainer>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div>
                    <span className="text-content-emphasis text-sm font-medium">
                      Preview
                    </span>
                    <p className="text-xs text-neutral-500">
                      This is calculated using your{" "}
                      <Link
                        href={`/${workspaceSlug}/program/settings/rewards`}
                        target="_blank"
                        className="underline hover:text-neutral-600"
                      >
                        default program reward
                      </Link>
                    </p>
                  </div>
                  <Preview control={control} />
                </div>
              </div>
            </div>

            {/* Bottom scroll fade */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
              style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              onClick={() => setShowModal(false)}
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit px-3"
            />
            <Button
              type="submit"
              variant="primary"
              text={defaultValues ? "Update" : "Add"}
              className="h-8 w-fit px-3"
            />
          </div>
        </form>
      </div>
    </>
  );
}

function Preview({
  control,
}: {
  control: Control<EarningsCalculatorBlockData>;
}) {
  const productPrice = useWatch({ control, name: "productPrice" });
  const billingPeriod = useWatch({ control, name: "billingPeriod" });
  const minSales = useWatch({ control, name: "minSales" });
  const maxSales = useWatch({ control, name: "maxSales" });

  const { group } = useGroup();

  if (!group) return null;

  return (
    <EarningsCalculatorBlock
      block={{
        id: "",
        type: "earnings-calculator",
        data: {
          productPrice:
            Math.min(Math.max(productPrice || 0, 0), MAX_PRODUCT_PRICE) * 100,
          billingPeriod: billingPeriod ?? "monthly",
          minSales: minSales || undefined,
          maxSales: maxSales || undefined,
        },
      }}
      group={group}
      showTitleAndDescription={false}
    />
  );
}
