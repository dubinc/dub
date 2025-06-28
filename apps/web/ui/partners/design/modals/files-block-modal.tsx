"use client";

import { programLanderFilesBlockSchema } from "@/lib/zod/schemas/program-lander";
import {
  Button,
  CircleWarning,
  Modal,
  useMediaQuery,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useId, useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { EditList, EditListItem } from "../edit-list";

type FilesBlockData = z.infer<typeof programLanderFilesBlockSchema>["data"];

type FilesBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<FilesBlockData>;
  onSubmit: (data: FilesBlockData) => void;
};

export function FilesBlockModal(props: FilesBlockModalProps) {
  return (
    <Modal
      showModal={props.showModal}
      setShowModal={props.setShowModal}
      className=""
    >
      <FilesBlockModalInner {...props} />
    </Modal>
  );
}

function FilesBlockModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: FilesBlockModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const form = useForm<FilesBlockData>({
    defaultValues: defaultValues ?? {
      title: "",
      items: [
        {
          id: uuid(),
          name: "File 1",
          description: "",
          url: "",
        },
      ],
    },
  });

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const fields = watch("items");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <FormProvider {...form}>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} Files
        </h3>
        <form
          className="mt-4 flex flex-col gap-6"
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(async (data) => {
              setShowModal(false);
              onSubmit(data);
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
                placeholder="Title"
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("title")}
              />
            </div>
          </div>

          <div className="relative -my-2">
            <div
              ref={scrollRef}
              onScroll={updateScrollProgress}
              className="scrollbar-hide relative max-h-[calc(100vh-300px)] overflow-y-auto py-2"
            >
              <EditList
                values={fields.map(({ id }) => id)}
                onAdd={() => {
                  const id = uuid();

                  setValue(
                    "items",
                    [
                      ...fields,
                      {
                        id,
                        name: `File ${fields.length + 1}`,
                        description: "",
                        url: "",
                      },
                    ],
                    { shouldDirty: true },
                  );

                  return id;
                }}
                onReorder={(updated) =>
                  setValue(
                    "items",
                    updated.map((id) => fields.find((f) => f.id === id)!),
                    { shouldDirty: true },
                  )
                }
              >
                {fields.map((field, index) => {
                  const fieldErrors = errors.items?.[index];

                  return (
                    <EditListItem
                      key={field.id}
                      value={field.id}
                      title={
                        <span className="flex items-center gap-2">
                          {field.name || "File"}
                          {(fieldErrors?.url || fieldErrors?.name) && (
                            <CircleWarning className="size-3.5 text-red-600" />
                          )}
                        </span>
                      }
                      onRemove={
                        fields.length > 1
                          ? () =>
                              setValue(
                                "items",
                                fields.filter(({ id }) => id !== field.id),
                                { shouldDirty: true },
                              )
                          : undefined
                      }
                    >
                      <div className="flex flex-col gap-6">
                        {/* Name */}
                        <div>
                          <label
                            htmlFor={`${id}-${field.id}-name`}
                            className="flex items-center gap-2 text-sm font-medium text-neutral-700"
                          >
                            Display name
                          </label>
                          <div className="mt-2 rounded-md shadow-sm">
                            <input
                              id={`${id}-${field.id}-name`}
                              type="text"
                              placeholder="Brand assets"
                              className={cn(
                                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                fieldErrors?.name &&
                                  "border-red-600 focus:border-red-500 focus:ring-red-600",
                              )}
                              {...register(`items.${index}.name`, {
                                required: "Display name is required",
                              })}
                            />
                          </div>
                        </div>

                        {/* URL */}
                        <div>
                          <label
                            htmlFor={`${id}-${field.id}-url`}
                            className="flex items-center gap-2 text-sm font-medium text-neutral-700"
                          >
                            File URL
                          </label>
                          <div className="mt-2 rounded-md shadow-sm">
                            <input
                              id={`${id}-${field.id}-url`}
                              type="text"
                              placeholder="https://example.com/file.pdf"
                              className={cn(
                                "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                                fieldErrors?.url &&
                                  "border-red-600 focus:border-red-500 focus:ring-red-600",
                              )}
                              {...register(`items.${index}.url`, {
                                required: "File URL is required",
                              })}
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label
                            htmlFor={`${id}-${field.id}-description`}
                            className="flex items-center gap-2 text-sm font-medium text-neutral-700"
                          >
                            Description
                          </label>
                          <div className="mt-2 rounded-md shadow-sm">
                            <textarea
                              id={`${id}-${field.id}-description`}
                              rows={2}
                              maxLength={240}
                              placeholder="More information about the file"
                              className="block max-h-32 min-h-10 w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                              {...register(`items.${index}.description`)}
                            />
                          </div>
                        </div>
                      </div>
                    </EditListItem>
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
    </FormProvider>
  );
}

export function FilesBlockThumbnail() {
  const id = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="168"
      height="100"
      fill="none"
      viewBox="0 0 168 100"
      className="h-auto w-full"
    >
      <g clipPath={`url(#${id}-a)`}>
        <path
          fill="#fff"
          d="M26.27 30.595H181.5v39.811H26.27a4.77 4.77 0 0 1-4.77-4.77v-30.27a4.77 4.77 0 0 1 4.77-4.771"
        />
        <path
          stroke="#E5E5E5"
          d="M26.27 30.595H181.5v39.811H26.27a4.77 4.77 0 0 1-4.77-4.77v-30.27a4.77 4.77 0 0 1 4.77-4.771Z"
        />
        <path
          stroke="#E5E5E5"
          strokeWidth="0.659"
          d="M32.859 39.63h14.493a3.624 3.624 0 0 1 3.623 3.624v14.493a3.623 3.623 0 0 1-3.623 3.623H32.859a3.624 3.624 0 0 1-3.624-3.623V43.254a3.624 3.624 0 0 1 3.624-3.624Z"
        />
        <path
          fill="#000"
          d="M48.105 50.5a7.905 7.905 0 0 0-15.81 0 7.905 7.905 0 0 0 15.81 0"
        />
        <circle
          cx="1.854"
          cy="1.854"
          r="1.854"
          fill="#fff"
          transform="matrix(-1 0 0 1 44.718 50.145)"
        />
        <path fill="#fff" d="M42.046 46.503H38.73l-3.154 7.35h3.317z" />
        <text
          xmlSpace="preserve"
          fill="#262626"
          fontSize="9.223"
          fontWeight="500"
          letterSpacing="-.02em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="61.845" y="47.942">
            Primary logo
          </tspan>
        </text>
        <text
          xmlSpace="preserve"
          fill="#737373"
          fontSize="7.906"
          letterSpacing="-.02em"
          style={{ whiteSpace: "pre" }}
        >
          <tspan x="61.845" y="60.145">
            SVG
          </tspan>
        </text>
      </g>
      <defs>
        <clipPath id={`${id}-a`}>
          <path fill="#fff" d="M0 0h168v100H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
