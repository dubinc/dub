"use client";

import { programApplicationFormLongTextFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { Button, Modal, Switch, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { Dispatch, SetStateAction, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";

const MIN_LENGTH = 1;
const MAX_LENGTH = 5000;
const DEFAULT_MAX_LENGTH = 500;

type LongTextFieldData = z.infer<
  typeof programApplicationFormLongTextFieldSchema
>;

type LongTextFieldModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<LongTextFieldData>;
  onSubmit: (data: LongTextFieldData) => void;
};

export function LongTextFieldModal(props: LongTextFieldModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <LongTextFieldModalInner {...props} />
    </Modal>
  );
}

type FormData = Omit<LongTextFieldData, "data"> & {
  data: LongTextFieldData["data"] & {
    maxLengthEnabled: boolean;
  };
};

const longTextFieldDataFromFormData = (
  formData: FormData,
): LongTextFieldData => {
  const { data, ...rest } = formData;
  const { maxLength, maxLengthEnabled, ...dataRest } = data;
  return {
    ...rest,
    data: {
      ...dataRest,
      maxLength: data.maxLengthEnabled ? data.maxLength : undefined,
    },
  };
};

const formDataForLongTextFieldData = (
  longTextFieldData?: Partial<LongTextFieldData>,
): FormData => {
  const maxLength = longTextFieldData?.data?.maxLength;
  const hasMaxLength = typeof maxLength === "number";
  return {
    id: longTextFieldData?.id ?? uuid(),
    type: longTextFieldData?.type ?? "long-text",
    label: longTextFieldData?.label ?? "",
    required: longTextFieldData?.required ?? false,
    data: {
      placeholder: longTextFieldData?.data?.placeholder ?? "",
      maxLengthEnabled: hasMaxLength,
      maxLength: hasMaxLength ? maxLength : DEFAULT_MAX_LENGTH,
    },
  };
};

function LongTextFieldModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: LongTextFieldModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const {
    control,
    handleSubmit,
    register,
    unregister,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: formDataForLongTextFieldData(defaultValues),
  });

  const maxLengthEnabled = watch("data.maxLengthEnabled");

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} long text
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit(longTextFieldDataFromFormData(data));
            })(e);
          }}
        >
          {/* Label */}
          <div>
            <label
              htmlFor={`${id}-label`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Input label
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-title`}
                type="text"
                placeholder=""
                autoFocus={!isMobile}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  !!errors.label &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("label", { required: true })}
              />
            </div>
          </div>

          {/* Placeholder */}
          <div>
            <label
              htmlFor={`${id}-placeholder`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Input placeholder
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-placeholder`}
                type="text"
                placeholder=""
                autoFocus={!isMobile}
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  !!errors.data?.placeholder &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("data.placeholder")}
              />
            </div>
          </div>

          {/* Required */}
          <div>
            <Controller
              name="required"
              control={control}
              render={({ field }) => (
                <label
                  className="flex items-center justify-between gap-1.5"
                  htmlFor={`${id}-required`}
                >
                  <span className="text-sm font-medium text-neutral-700">
                    Required
                  </span>
                  <Switch
                    id={`${id}-required`}
                    checked={field.value}
                    fn={field.onChange}
                    trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
                    thumbDimensions="size-3"
                    thumbTranslate="translate-x-3"
                  />
                </label>
              )}
            />
          </div>

          {/* Max characters */}
          <div className="flex flex-col gap-2">
            <Controller
              name="data.maxLengthEnabled"
              control={control}
              render={({ field }) => {
                return (
                  <label
                    className="flex items-center justify-between gap-1.5"
                    htmlFor={`${id}-max-length-enabled`}
                  >
                    <span className="text-sm font-medium text-neutral-700">
                      Max characters
                    </span>
                    <Switch
                      id={`${id}-max-length-enabled`}
                      checked={field.value}
                      fn={field.onChange}
                      trackDimensions="radix-state-checked:bg-black focus-visible:ring-black/20 w-7 h-4"
                      thumbDimensions="size-3"
                      thumbTranslate="translate-x-3"
                    />
                  </label>
                );
              }}
            />

            <motion.div
              animate={{
                height: maxLengthEnabled ? "auto" : 0,
                overflow: "hidden",
              }}
              transition={{
                duration: 0.15,
              }}
              initial={maxLengthEnabled}
              className="-m-1"
            >
              <div className="p-1">
                <input
                  id={`${id}-max-length`}
                  type="number"
                  placeholder=""
                  {...(maxLengthEnabled
                    ? register("data.maxLength", {
                        min: {
                          value: MIN_LENGTH,
                          message: `Please enter a number between ${MIN_LENGTH} and ${MAX_LENGTH}`,
                        },
                        max: {
                          value: MAX_LENGTH,
                          message: `Please enter a number between ${MIN_LENGTH} and ${MAX_LENGTH}`,
                        },
                        valueAsNumber: true,
                      })
                    : {})}
                  autoFocus={!isMobile}
                  className={cn(
                    "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    !!errors.data?.maxLength &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                />
              </div>

              {errors.data?.maxLength?.message && (
                <div className={cn("ml-1 mt-1 text-xs text-red-500")}>
                  {errors.data?.maxLength.message}
                </div>
              )}
            </motion.div>
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
