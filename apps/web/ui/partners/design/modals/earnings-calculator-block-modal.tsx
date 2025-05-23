"use client";

import { programLanderEarningsCalculatorBlockSchema } from "@/lib/zod/schemas/program-lander";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type EarningsCalculatorBlockData = z.infer<
  typeof programLanderEarningsCalculatorBlockSchema
>["data"];

type EarningsCalculatorBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<EarningsCalculatorBlockData>;
  onSubmit: (data: EarningsCalculatorBlockData) => void;
};

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
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<EarningsCalculatorBlockData>({
    defaultValues,
  });

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} earnings calculator
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit({ ...data, productPrice: Number(data.productPrice) });
            })(e);
          }}
        >
          {/* Title */}
          <div>
            <label
              htmlFor={`${id}-title`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Section heading
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-title`}
                type="text"
                placeholder="Earnings calculator"
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("title")}
              />
            </div>
          </div>

          {/* Product price */}
          <div>
            <label
              htmlFor={`${id}-price`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Average product price
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-price`}
                type="text"
                placeholder="30"
                autoFocus={!isMobile}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.productPrice &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("productPrice")}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
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
