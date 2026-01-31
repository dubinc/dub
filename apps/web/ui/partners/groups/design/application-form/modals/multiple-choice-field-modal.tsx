"use client";

import { programApplicationFormMultipleChoiceFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { EditList, EditListItem } from "@/ui/partners/groups/design/edit-list";
import {
  Button,
  Modal,
  Switch,
  useMediaQuery,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useId, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";

type MultipleChoiceFieldData = z.infer<
  typeof programApplicationFormMultipleChoiceFieldSchema
>;

type MultipleChoiceFieldModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<MultipleChoiceFieldData>;
  onSubmit: (data: MultipleChoiceFieldData) => void;
};

export function MultipleChoiceFieldModal(props: MultipleChoiceFieldModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <MultipleChoiceFieldModalInner {...props} />
    </Modal>
  );
}

function MultipleChoiceFieldModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: MultipleChoiceFieldModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();

  const form = useForm<MultipleChoiceFieldData>({
    defaultValues: defaultValues ?? {
      id: uuid(),
      type: "multiple-choice",
      label: "",
      required: false,
      data: {
        multiple: false,
        options: [
          {
            id: uuid(),
            value: "",
          },
        ],
      },
    },
  });

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
    control,
  } = form;

  const fields = watch("data.options");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <FormProvider {...form}>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} multiple choice
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              if (data.data.options.length < 2) {
                setError("data.options", {
                  type: "manual",
                  message: "Requires minimum of 2 options",
                });
                return;
              }

              setShowModal(false);
              onSubmit(data);
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

          {/* Allow multiple selections */}
          <div>
            <Controller
              name="data.multiple"
              control={control}
              render={({ field }) => (
                <label
                  className="flex items-center justify-between gap-1.5"
                  htmlFor={`${id}-multiple`}
                >
                  <span className="text-sm font-medium text-neutral-700">
                    Allow multiple selections
                  </span>
                  <Switch
                    id={`${id}-multiple`}
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

          <div>
            <label
              htmlFor={`${id}-options`}
              className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Options
            </label>

            <div className="relative -my-2">
              <div
                ref={scrollRef}
                onScroll={updateScrollProgress}
                className="scrollbar-hide relative max-h-[calc(100vh-300px)] overflow-y-auto py-2"
              >
                <EditList
                  values={fields.map(({ id }) => id)}
                  addButtonLabel="Add option"
                  onAdd={() => {
                    const id = uuid();

                    const newOptions = [
                      ...fields,
                      {
                        id,
                        value: "",
                      },
                    ];

                    setValue("data.options", newOptions, { shouldDirty: true });

                    if (newOptions.length >= 2) {
                      clearErrors("data.options");
                    }

                    return id;
                  }}
                  onReorder={(updated) =>
                    setValue(
                      "data.options",
                      updated.map((id) => fields.find((f) => f.id === id)!),
                      { shouldDirty: true },
                    )
                  }
                >
                  {fields.map((field, index) => {
                    const error = errors.data?.options?.[index]?.value;

                    return (
                      <EditListItem
                        key={field.id}
                        value={field.id}
                        error={!!error?.message}
                        className={cn(
                          !error && "focus-within:border-neutral-500",
                        )}
                        title={
                          <input
                            id={`${id}-${field.id}-name`}
                            type="text"
                            placeholder="Option"
                            className={cn(
                              "my-1 block w-full rounded-md border-transparent bg-transparent py-1 text-sm text-neutral-900 placeholder-neutral-400 focus:border-transparent focus:outline-none focus:ring-0",
                            )}
                            {...register(`data.options.${index}.value`, {
                              required: "Value is required",
                            })}
                          />
                        }
                        onRemove={
                          fields.length > 1
                            ? () =>
                                setValue(
                                  "data.options",
                                  fields.filter(({ id }) => id !== field.id),
                                  { shouldDirty: true },
                                )
                            : undefined
                        }
                      />
                    );
                  })}
                </EditList>
              </div>

              {/* Bottom scroll fade */}
              <div
                className="pointer-events-none absolute bottom-0 left-0 hidden h-16 w-full bg-gradient-to-t from-white sm:block"
                style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              {errors.data?.options?.message && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {errors.data?.options?.message}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
          </div>
        </form>
      </div>
    </FormProvider>
  );
}
