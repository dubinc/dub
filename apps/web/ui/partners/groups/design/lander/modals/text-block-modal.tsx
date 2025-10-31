"use client";

import { programLanderTextBlockSchema } from "@/lib/zod/schemas/program-lander";
import {
  Button,
  MarkdownIcon,
  Modal,
  useEnterSubmit,
  useMediaQuery,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, SetStateAction, useId } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type TextBlockData = z.infer<typeof programLanderTextBlockSchema>["data"];

type TextBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<TextBlockData>;
  onSubmit: (data: TextBlockData) => void;
};

export function TextBlockModal(props: TextBlockModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <TextBlockModalInner {...props} />
    </Modal>
  );
}

function TextBlockModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: TextBlockModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm<TextBlockData>({
    defaultValues,
  });

  const { handleKeyDown } = useEnterSubmit();

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          {defaultValues ? "Edit" : "Add"} Text
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

          {/* Description */}
          <div>
            <label
              htmlFor={`${id}-content`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Content
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <textarea
                id={`${id}-content`}
                rows={12}
                maxLength={10000}
                onKeyDown={handleKeyDown}
                placeholder="Start typing..."
                className={cn(
                  "block max-h-64 min-h-16 w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.content &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("content", { required: "Content is required" })}
              />
            </div>
            <a
              href="https://www.markdownguide.org/basic-syntax/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-subtle mt-1 flex items-center gap-1 text-xs"
            >
              <MarkdownIcon role="presentation" className="h-3 w-auto" />
              <span className="sr-only">MarkdownIcon</span> supported
            </a>
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

export function TextBlockThumbnail() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="168"
      height="100"
      fill="none"
      viewBox="0 0 168 100"
      className="h-auto w-full"
    >
      <path fill="#D9D9D9" d="M34 43h2v14h-2z"></path>
      <text
        xmlSpace="preserve"
        fill="#262626"
        fontSize="13"
        style={{ whiteSpace: "pre" }}
      >
        <tspan x="40" y="54.727">
          About Acme
        </tspan>
      </text>
    </svg>
  );
}
