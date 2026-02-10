"use client";

import { programApplicationFormImageUploadFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { Button, Modal, Switch, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { Dispatch, SetStateAction, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";

const MIN_MAX_IMAGES = 2;
const MAX_MAX_IMAGES = 10;
const DEFAULT_MAX_IMAGES = 4;

type ImageUploadFieldData = z.infer<
  typeof programApplicationFormImageUploadFieldSchema
>;

type ImageUploadFieldModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<ImageUploadFieldData>;
  onSubmit: (data: ImageUploadFieldData) => void;
};

export function ImageUploadFieldModal(props: ImageUploadFieldModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <ImageUploadFieldModalInner {...props} />
    </Modal>
  );
}

type FormData = Omit<ImageUploadFieldData, "data"> & {
  data: ImageUploadFieldData["data"] & {
    allowMultiple: boolean;
  };
};

const imageUploadFieldDataFromFormData = (
  formData: FormData,
): ImageUploadFieldData => {
  const { data, ...rest } = formData;
  const { allowMultiple, maxImages, ...dataRest } = data;
  return {
    ...rest,
    data: {
      ...dataRest,
      maxImages: allowMultiple ? maxImages : 1,
    },
  };
};

const formDataForImageUploadFieldData = (
  imageUploadFieldData?: Partial<ImageUploadFieldData>,
): FormData => {
  const maxImages = imageUploadFieldData?.data?.maxImages ?? 1;
  const allowMultiple = maxImages > 1;

  return {
    id: imageUploadFieldData?.id ?? uuid(),
    type: imageUploadFieldData?.type ?? "image-upload",
    label: imageUploadFieldData?.label ?? "",
    required: imageUploadFieldData?.required ?? false,
    data: {
      allowMultiple,
      maxImages: allowMultiple ? maxImages : DEFAULT_MAX_IMAGES,
    },
  };
};

function ImageUploadFieldModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: ImageUploadFieldModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const {
    control,
    handleSubmit,
    register,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: formDataForImageUploadFieldData(defaultValues),
  });

  const allowMultiple = watch("data.allowMultiple");

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} image upload
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit(imageUploadFieldDataFromFormData(data));
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
                id={`${id}-label`}
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

          {/* Allow multiple images */}
          <div className="flex flex-col gap-2">
            <Controller
              name="data.allowMultiple"
              control={control}
              render={({ field }) => {
                return (
                  <label
                    className="flex items-center justify-between gap-1.5"
                    htmlFor={`${id}-allow-multiple`}
                  >
                    <span className="text-sm font-medium text-neutral-700">
                      Allow multiple images
                    </span>
                    <Switch
                      id={`${id}-allow-multiple`}
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
                height: allowMultiple ? "auto" : 0,
                overflow: "hidden",
              }}
              transition={{
                duration: 0.15,
              }}
              initial={allowMultiple}
              className="-m-1"
            >
              <div className="p-1">
                <div className="rounded-md shadow-sm">
                  <input
                    id={`${id}-max-images`}
                    type="number"
                    placeholder="Maximum number of images"
                    {...(allowMultiple
                      ? register("data.maxImages", {
                          required: true,
                          min: {
                            value: MIN_MAX_IMAGES,
                            message: `Please enter a number between ${MIN_MAX_IMAGES} and ${MAX_MAX_IMAGES}`,
                          },
                          max: {
                            value: MAX_MAX_IMAGES,
                            message: `Please enter a number between ${MIN_MAX_IMAGES} and ${MAX_MAX_IMAGES}`,
                          },
                          valueAsNumber: true,
                        })
                      : {})}
                    autoFocus={!isMobile}
                    className={cn(
                      "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      !!errors.data?.maxImages &&
                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                    )}
                  />
                </div>
                {errors.data?.maxImages?.message && (
                  <div className={cn("ml-1 mt-1 text-xs text-red-500")}>
                    {errors.data.maxImages.message}
                  </div>
                )}
              </div>
            </motion.div>
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

export function ImageUploadFieldThumbnail() {
  return (
    <svg
      width="171"
      height="100"
      viewBox="0 0 171 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
    >
      <rect
        x="50.6685"
        y="25.419"
        width="63.33"
        height="59.33"
        rx="5.665"
        fill="white"
      />
      <rect
        x="50.6685"
        y="25.419"
        width="63.33"
        height="59.33"
        rx="5.665"
        stroke="#D4D4D4"
        strokeWidth="0.67"
      />
      <rect
        x="46.6685"
        y="21.419"
        width="71.33"
        height="59.33"
        rx="5.665"
        fill="white"
      />
      <rect
        x="46.6685"
        y="21.419"
        width="71.33"
        height="59.33"
        rx="5.665"
        stroke="#D4D4D4"
        strokeWidth="0.67"
      />
      <rect
        x="42.4283"
        y="17.335"
        width="79.33"
        height="59.33"
        rx="5.665"
        fill="white"
      />
      <rect
        x="42.4283"
        y="17.335"
        width="79.33"
        height="59.33"
        rx="5.665"
        stroke="#D4D4D4"
        strokeWidth="0.67"
      />
      <path
        d="M75.4266 54.6678L83.2085 46.8871C84.2499 45.8458 85.9379 45.846 86.9792 46.8874L91.7601 51.6691"
        stroke="#262626"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M75.0931 54.6666L89.0931 54.6678C90.5659 54.6679 91.7599 53.4741 91.76 52.0013L91.7608 42.0013C91.7609 40.5285 90.5671 39.3345 89.0943 39.3344L75.0943 39.3333C73.6216 39.3332 72.4276 40.527 72.4275 41.9997L72.4266 51.9997C72.4265 53.4725 73.6203 54.6665 75.0931 54.6666Z"
        stroke="#262626"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M77.7606 46.3315C78.6811 46.3316 79.4274 45.5855 79.4274 44.665C79.4275 43.7445 78.6814 42.9983 77.7609 42.9982C76.8404 42.9981 76.0942 43.7442 76.0941 44.6647C76.094 45.5852 76.8402 46.3314 77.7606 46.3315Z"
        fill="#262626"
      />
    </svg>
  );
}
