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
const MAX_MAX_IMAGES = 20;
const DEFAULT_MAX_IMAGES = 5;

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
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="size-full"
    >
      <rect x="0.5" y="0.5" width="47" height="47" rx="5.5" fill="white" />
      <rect x="0.5" y="0.5" width="47" height="47" rx="5.5" stroke="#E5E5E5" />
      <rect x="6" y="14" width="16" height="20" rx="2" fill="#F5F5F5" />
      <rect x="6" y="14" width="16" height="20" rx="2" stroke="#E5E5E5" />
      <circle cx="10" cy="18" r="1.5" fill="#D9D9D9" />
      <path
        d="M6 30L10 25L14 30H6Z"
        fill="#D9D9D9"
        stroke="#E5E5E5"
        strokeWidth="0.5"
      />
      <rect x="26" y="14" width="16" height="20" rx="2" fill="#F5F5F5" />
      <rect x="26" y="14" width="16" height="20" rx="2" stroke="#E5E5E5" />
      <circle cx="30" cy="18" r="1.5" fill="#D9D9D9" />
      <path
        d="M26 30L30 25L34 30H26Z"
        fill="#D9D9D9"
        stroke="#E5E5E5"
        strokeWidth="0.5"
      />
    </svg>
  );
}
