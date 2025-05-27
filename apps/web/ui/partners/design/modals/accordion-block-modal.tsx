"use client";

import { programLanderAccordionBlockSchema } from "@/lib/zod/schemas/program-lander";
import {
  Button,
  CircleWarning,
  Modal,
  useMediaQuery,
  useScrollProgress,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useId, useRef } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { EditList, EditListItem } from "../edit-list";

type AccordionBlockData = z.infer<
  typeof programLanderAccordionBlockSchema
>["data"];

type AccordionBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<AccordionBlockData>;
  onSubmit: (data: AccordionBlockData) => void;
};

export function AccordionBlockModal(props: AccordionBlockModalProps) {
  return (
    <Modal
      showModal={props.showModal}
      setShowModal={props.setShowModal}
      className=""
    >
      <AccordionBlockModalInner {...props} />
    </Modal>
  );
}

function AccordionBlockModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: AccordionBlockModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccordionBlockData>({
    defaultValues: defaultValues ?? {
      title: "",
      items: [
        {
          id: uuid(),
          title: "Item 1",
          content: "",
        },
      ],
    },
  });

  const fields = watch("items");

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  return (
    <div className="p-4 pt-3">
      <h3 className="text-base font-semibold leading-6 text-neutral-800">
        {defaultValues ? "Edit" : "Add"} Accordion
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
                      title: `Item ${fields.length + 1}`,
                      content: "",
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
                        {field.title || "Item"}
                        {(fieldErrors?.title || fieldErrors?.content) && (
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
                      {/* Title */}
                      <div>
                        <label
                          htmlFor={`${id}-${field.id}-title`}
                          className="flex items-center gap-2 text-sm font-medium text-neutral-700"
                        >
                          Title
                        </label>
                        <div className="mt-2 rounded-md shadow-sm">
                          <input
                            id={`${id}-${field.id}-title`}
                            type="text"
                            placeholder="Title"
                            className={cn(
                              "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              fieldErrors?.title &&
                                "border-red-600 focus:border-red-500 focus:ring-red-600",
                            )}
                            {...register(`items.${index}.title`, {
                              required: "Title is required",
                            })}
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div>
                        <label
                          htmlFor={`${id}-${field.id}-content`}
                          className="flex items-center gap-2 text-sm font-medium text-neutral-700"
                        >
                          Content
                        </label>
                        <div className="mt-2 rounded-md shadow-sm">
                          <textarea
                            id={`${id}-${field.id}-content`}
                            rows={3}
                            maxLength={1000}
                            placeholder="Start typing"
                            className={cn(
                              "block max-h-32 min-h-16 w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              fieldErrors?.content &&
                                "border-red-600 focus:border-red-500 focus:ring-red-600",
                            )}
                            {...register(`items.${index}.content`, {
                              required: "Content is required",
                            })}
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
  );
}

export function AccordionBlockThumbnail() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="168"
      height="100"
      fill="none"
      viewBox="0 0 168 100"
      className="h-auto w-full"
    >
      <path
        fill="#E5E5E5"
        d="M31 22.234v.216h106v-.431H31zm106 35.789v-.216H31v.431h106z"
      />
      <text
        xmlSpace="preserve"
        fill="#262626"
        fontSize="6.894"
        fontWeight="600"
        letterSpacing="-.02em"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="31" y="36.807">
          Question 1
        </tspan>
      </text>
      <path
        stroke="#737373"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="0.646"
        d="m130.106 30.852-4.309 4.308M125.797 30.852l4.309 4.308"
      />
      <text
        xmlSpace="preserve"
        fill="#262626"
        fontSize="6.894"
        letterSpacing="-.02em"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="31" y="47.807">
          Here’s the answer!
        </tspan>
      </text>
      <path
        fill="#E5E5E5"
        d="M31 58.023v.216h106v-.431H31zm106 21.342v-.215H31v.43h106z"
      />
      <text
        xmlSpace="preserve"
        fill="#262626"
        fontSize="6.894"
        fontWeight="600"
        letterSpacing="-.02em"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="31" y="70.871">
          Question 2
        </tspan>
      </text>
      <path
        stroke="#737373"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="0.646"
        d="M127.951 66.217v4.955M125.474 68.693h4.955"
      />
    </svg>
  );
}
