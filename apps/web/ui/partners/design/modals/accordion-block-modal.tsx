"use client";

import { programLanderAccordionBlockSchema } from "@/lib/zod/schemas/program-lander";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { Dispatch, SetStateAction, useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

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
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
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
  const { handleSubmit, register, control } = useForm<AccordionBlockData>({
    defaultValues,
  });

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray(
    {
      control,
      name: "items",
    },
  );

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Add Accordion
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

          <div>
            {fields.map((field, index) => (
              <div key={field.id}>
                <input {...register(`items.${index}.title`)} />
                <input {...register(`items.${index}.content`)} />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                append({
                  id: crypto.randomUUID(),
                  title: "title",
                  content: "content",
                })
              }
            >
              add
            </button>
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
              text="Add"
              className="h-8 w-fit px-3"
            />
          </div>
        </form>
      </div>
    </>
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
