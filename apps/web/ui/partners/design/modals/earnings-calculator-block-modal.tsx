"use client";

import useDiscounts from "@/lib/swr/use-discounts";
import useProgram from "@/lib/swr/use-program";
import useRewards from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import { Button, Modal, useMediaQuery, useScrollProgress } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { Dispatch, SetStateAction, useId, useRef } from "react";
import { Control, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { EarningsCalculatorBlock } from "../../lander/blocks/earnings-calculator-block";
import { useBrandingFormContext } from "../branding-form";

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

  const { program } = useProgram();
  const { control: brandingFormControl } = useBrandingFormContext();

  const brandColor = useWatch({
    control: brandingFormControl,
    name: "brandColor",
  });

  const { rewards } = useRewards();
  const { discounts } = useDiscounts();
  const landerData = useWatch({
    control: brandingFormControl,
    name: "landerData",
  });

  if (!program) return null;

  return (
    <EarningsCalculatorBlock
      block={{
        id: "",
        type: "earnings-calculator",
        data: {
          productPrice:
            Math.min(Math.max(productPrice || 0, 0), MAX_PRODUCT_PRICE) * 100,
        },
      }}
      program={{ ...program, brandColor, rewards, discounts, landerData }}
      showTitleAndDescription={false}
    />
  );
}
