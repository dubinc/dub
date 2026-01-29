"use client";

import { programApplicationFormShortTextFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { Button, Modal, Switch, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { Dispatch, SetStateAction, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";

const MIN_LENGTH = 1;
const MAX_LENGTH = 1000;
const DEFAULT_MAX_LENGTH = 25;

type ShortTextFieldData = z.infer<
  typeof programApplicationFormShortTextFieldSchema
>;

type ShortTextFieldModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<ShortTextFieldData>;
  onSubmit: (data: ShortTextFieldData) => void;
};

export function ShortTextFieldModal(props: ShortTextFieldModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <ShortTextFieldModalInner {...props} />
    </Modal>
  );
}

type FormData = Omit<ShortTextFieldData, "data"> & {
  data: ShortTextFieldData["data"] & {
    maxLengthEnabled: boolean;
  };
};

const shortTextFieldDataFromFormData = (
  formData: FormData,
): ShortTextFieldData => {
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

const formDataForShortTextFieldData = (
  shortTextFieldData?: Partial<ShortTextFieldData>,
): FormData => {
  const maxLength = shortTextFieldData?.data?.maxLength;
  const hasMaxLength = typeof maxLength === "number";
  return {
    id: shortTextFieldData?.id ?? uuid(),
    type: shortTextFieldData?.type ?? "short-text",
    label: shortTextFieldData?.label ?? "",
    required: shortTextFieldData?.required ?? false,
    data: {
      placeholder: shortTextFieldData?.data?.placeholder ?? "",
      maxLengthEnabled: hasMaxLength,
      maxLength: hasMaxLength ? maxLength : DEFAULT_MAX_LENGTH,
    },
  };
};

function ShortTextFieldModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: ShortTextFieldModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
    watch,
  } = useForm<FormData>({
    defaultValues: formDataForShortTextFieldData(defaultValues),
  });

  const maxLengthEnabled = watch("data.maxLengthEnabled");

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} short text
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit(shortTextFieldDataFromFormData(data));
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

export function ShortTextFieldThumbnail() {
  return (
    <svg
      width="168"
      height="100"
      viewBox="0 0 168 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
    >
      <rect x="0.5" y="0.5" width="167" height="99" rx="5.5" fill="white" />
      <rect x="0.5" y="0.5" width="167" height="99" rx="5.5" stroke="#E5E5E5" />
      <path
        d="M47.1449 55V45.5455H48.2898V49.7557H53.331V45.5455H54.4759V55H53.331V50.7713H48.2898V55H47.1449ZM59.5932 55.1477C58.91 55.1477 58.3206 54.9969 57.8251 54.6953C57.3327 54.3906 56.9526 53.9659 56.6848 53.4212C56.4202 52.8733 56.2878 52.2363 56.2878 51.5099C56.2878 50.7836 56.4202 50.1435 56.6848 49.5895C56.9526 49.0324 57.325 48.5985 57.802 48.2876C58.2821 47.9737 58.8423 47.8168 59.4824 47.8168C59.8517 47.8168 60.2164 47.8783 60.5765 48.0014C60.9366 48.1245 61.2644 48.3246 61.5598 48.6016C61.8553 48.8755 62.0907 49.2386 62.2662 49.6911C62.4416 50.1435 62.5293 50.7005 62.5293 51.3622V51.8239H57.0634V50.8821H61.4213C61.4213 50.482 61.3413 50.125 61.1813 49.8111C61.0243 49.4972 60.7997 49.2494 60.5073 49.0678C60.218 48.8862 59.8764 48.7955 59.4824 48.7955C59.0485 48.7955 58.673 48.9032 58.356 49.1186C58.0421 49.331 57.8005 49.608 57.6312 49.9496C57.4619 50.2912 57.3773 50.6574 57.3773 51.0483V51.6761C57.3773 52.2116 57.4696 52.6656 57.6543 53.038C57.842 53.4073 58.1021 53.6889 58.4345 53.8828C58.7669 54.0736 59.1531 54.169 59.5932 54.169C59.8794 54.169 60.138 54.129 60.3688 54.049C60.6027 53.9659 60.8043 53.8428 60.9735 53.6797C61.1428 53.5135 61.2736 53.3073 61.3659 53.0611L62.4185 53.3565C62.3077 53.7135 62.1215 54.0275 61.8599 54.2983C61.5983 54.5661 61.2752 54.7753 60.8904 54.9261C60.5057 55.0739 60.0733 55.1477 59.5932 55.1477ZM65.2761 45.5455V55H64.1866V45.5455H65.2761ZM68.3611 45.5455V55H67.2716V45.5455H68.3611ZM73.2372 55.1477C72.5971 55.1477 72.0354 54.9954 71.5522 54.6907C71.0721 54.386 70.6966 53.9598 70.4258 53.4119C70.158 52.8641 70.0241 52.224 70.0241 51.4915C70.0241 50.7528 70.158 50.1081 70.4258 49.5572C70.6966 49.0063 71.0721 48.5785 71.5522 48.2738C72.0354 47.9691 72.5971 47.8168 73.2372 47.8168C73.8774 47.8168 74.4375 47.9691 74.9176 48.2738C75.4008 48.5785 75.7763 49.0063 76.044 49.5572C76.3149 50.1081 76.4503 50.7528 76.4503 51.4915C76.4503 52.224 76.3149 52.8641 76.044 53.4119C75.7763 53.9598 75.4008 54.386 74.9176 54.6907C74.4375 54.9954 73.8774 55.1477 73.2372 55.1477ZM73.2372 54.169C73.7235 54.169 74.1236 54.0444 74.4375 53.7951C74.7514 53.5458 74.9838 53.218 75.1346 52.8118C75.2854 52.4055 75.3608 51.9654 75.3608 51.4915C75.3608 51.0175 75.2854 50.5759 75.1346 50.1665C74.9838 49.7572 74.7514 49.4264 74.4375 49.174C74.1236 48.9216 73.7235 48.7955 73.2372 48.7955C72.7509 48.7955 72.3509 48.9216 72.0369 49.174C71.723 49.4264 71.4906 49.7572 71.3398 50.1665C71.189 50.5759 71.1136 51.0175 71.1136 51.4915C71.1136 51.9654 71.189 52.4055 71.3398 52.8118C71.4906 53.218 71.723 53.5458 72.0369 53.7951C72.3509 54.0444 72.7509 54.169 73.2372 54.169ZM84.8534 47.9091V48.8324H81.1787V47.9091H84.8534ZM82.2497 46.2102H83.3392V52.9688C83.3392 53.2765 83.3838 53.5073 83.4731 53.6612C83.5654 53.812 83.6824 53.9136 83.824 53.9659C83.9686 54.0152 84.1209 54.0398 84.281 54.0398C84.401 54.0398 84.4995 54.0336 84.5764 54.0213C84.6534 54.0059 84.7149 53.9936 84.7611 53.9844L84.9827 54.9631C84.9088 54.9908 84.8057 55.0185 84.6734 55.0462C84.541 55.0769 84.3733 55.0923 84.1702 55.0923C83.8624 55.0923 83.5608 55.0262 83.2654 54.8938C82.973 54.7615 82.7298 54.5599 82.536 54.2891C82.3451 54.0182 82.2497 53.6766 82.2497 53.2642V46.2102ZM87.7341 50.7344V55H86.6446V45.5455H87.7341V49.017H87.8264C87.9926 48.6508 88.2419 48.36 88.5743 48.1445C88.9098 47.926 89.356 47.8168 89.9131 47.8168C90.3963 47.8168 90.8195 47.9137 91.1826 48.1076C91.5458 48.2984 91.8274 48.5923 92.0274 48.9893C92.2306 49.3833 92.3321 49.8849 92.3321 50.4943V55H91.2426V50.5682C91.2426 50.005 91.0964 49.5695 90.8041 49.2617C90.5148 48.9509 90.1131 48.7955 89.5992 48.7955C89.2422 48.7955 88.9221 48.8709 88.6389 49.0217C88.3589 49.1725 88.1373 49.3925 87.9742 49.6818C87.8141 49.9711 87.7341 50.322 87.7341 50.7344ZM97.2983 55.1477C96.6151 55.1477 96.0257 54.9969 95.5302 54.6953C95.0378 54.3906 94.6577 53.9659 94.3899 53.4212C94.1252 52.8733 93.9929 52.2363 93.9929 51.5099C93.9929 50.7836 94.1252 50.1435 94.3899 49.5895C94.6577 49.0324 95.0301 48.5985 95.5071 48.2876C95.9872 47.9737 96.5473 47.8168 97.1875 47.8168C97.5568 47.8168 97.9215 47.8783 98.2816 48.0014C98.6417 48.1245 98.9695 48.3246 99.2649 48.6016C99.5604 48.8755 99.7958 49.2386 99.9712 49.6911C100.147 50.1435 100.234 50.7005 100.234 51.3622V51.8239H94.7685V50.8821H99.1264C99.1264 50.482 99.0464 50.125 98.8864 49.8111C98.7294 49.4972 98.5047 49.2494 98.2124 49.0678C97.9231 48.8862 97.5814 48.7955 97.1875 48.7955C96.7536 48.7955 96.3781 48.9032 96.0611 49.1186C95.7472 49.331 95.5056 49.608 95.3363 49.9496C95.167 50.2912 95.0824 50.6574 95.0824 51.0483V51.6761C95.0824 52.2116 95.1747 52.6656 95.3594 53.038C95.5471 53.4073 95.8072 53.6889 96.1396 53.8828C96.4719 54.0736 96.8582 54.169 97.2983 54.169C97.5845 54.169 97.843 54.129 98.0739 54.049C98.3078 53.9659 98.5094 53.8428 98.6786 53.6797C98.8479 53.5135 98.9787 53.3073 99.071 53.0611L100.124 53.3565C100.013 53.7135 99.8266 54.0275 99.565 54.2983C99.3034 54.5661 98.9802 54.7753 98.5955 54.9261C98.2108 55.0739 97.7784 55.1477 97.2983 55.1477ZM101.892 55V47.9091H102.944V48.9801H103.018C103.147 48.6293 103.381 48.3446 103.72 48.1261C104.058 47.9076 104.44 47.7983 104.865 47.7983C104.945 47.7983 105.045 47.7998 105.165 47.8029C105.285 47.806 105.376 47.8106 105.437 47.8168V48.9247C105.4 48.9155 105.316 48.9016 105.183 48.8832C105.054 48.8616 104.917 48.8509 104.772 48.8509C104.428 48.8509 104.12 48.9232 103.849 49.0678C103.581 49.2094 103.369 49.4064 103.212 49.6587C103.058 49.908 102.981 50.1927 102.981 50.5128V55H101.892ZM109.486 55.1477C108.803 55.1477 108.213 54.9969 107.718 54.6953C107.225 54.3906 106.845 53.9659 106.577 53.4212C106.313 52.8733 106.18 52.2363 106.18 51.5099C106.18 50.7836 106.313 50.1435 106.577 49.5895C106.845 49.0324 107.218 48.5985 107.695 48.2876C108.175 47.9737 108.735 47.8168 109.375 47.8168C109.744 47.8168 110.109 47.8783 110.469 48.0014C110.829 48.1245 111.157 48.3246 111.452 48.6016C111.748 48.8755 111.983 49.2386 112.159 49.6911C112.334 50.1435 112.422 50.7005 112.422 51.3622V51.8239H106.956V50.8821H111.314C111.314 50.482 111.234 50.125 111.074 49.8111C110.917 49.4972 110.692 49.2494 110.4 49.0678C110.111 48.8862 109.769 48.7955 109.375 48.7955C108.941 48.7955 108.566 48.9032 108.249 49.1186C107.935 49.331 107.693 49.608 107.524 49.9496C107.355 50.2912 107.27 50.6574 107.27 51.0483V51.6761C107.27 52.2116 107.362 52.6656 107.547 53.038C107.735 53.4073 107.995 53.6889 108.327 53.8828C108.659 54.0736 109.046 54.169 109.486 54.169C109.772 54.169 110.031 54.129 110.261 54.049C110.495 53.9659 110.697 53.8428 110.866 53.6797C111.035 53.5135 111.166 53.3073 111.259 53.0611L112.311 53.3565C112.2 53.7135 112.014 54.0275 111.752 54.2983C111.491 54.5661 111.168 54.7753 110.783 54.9261C110.398 55.0739 109.966 55.1477 109.486 55.1477ZM115.52 45.5455L115.427 52.3409H114.356L114.264 45.5455H115.52ZM114.892 55.0739C114.664 55.0739 114.469 54.9923 114.305 54.8292C114.142 54.6661 114.061 54.4706 114.061 54.2429C114.061 54.0152 114.142 53.8197 114.305 53.6566C114.469 53.4935 114.664 53.4119 114.892 53.4119C115.119 53.4119 115.315 53.4935 115.478 53.6566C115.641 53.8197 115.723 54.0152 115.723 54.2429C115.723 54.3937 115.684 54.5322 115.607 54.6584C115.533 54.7846 115.433 54.8861 115.307 54.9631C115.184 55.0369 115.046 55.0739 114.892 55.0739Z"
        fill="#262626"
      />
      <rect x="119" y="43" width="2" height="14" fill="#D9D9D9" />
    </svg>
  );
}
