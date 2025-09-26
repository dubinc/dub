"use client";

import { Icon, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, Fragment, ReactNode, SetStateAction, useState } from "react";
import { useWatch } from "react-hook-form";
import { z } from "zod";
import { usePageBuilderFormContext } from "../page-builder-form";
import { SelectFieldModal, SelectFieldThumbnail } from "./select-field-modal";
import { LongTextFieldModal, LongTextFieldThumbnail } from "./long-text-field-modal";
import { programApplicationFormFieldSchema } from "@/lib/zod/schemas/program-application-form";
import { ShortTextFieldModal, ShortTextFieldThumbnail } from "./short-text-field-modal";
import { MultipleChoiceFieldModal, MultipleChoiceFieldThumbnail } from "./multiple-choice-field-modal";
import { WebsiteAndSocialsFieldModal, WebsiteAndSocialsFieldIcon } from "./website-and-socials-field-modal";

type AddFieldModalProps = {
  showAddFieldModal: boolean;
  setShowAddFieldModal: Dispatch<SetStateAction<boolean>>;
  addIndex: number;
};

export function AddFieldModal(props: AddFieldModalProps) {
  return (
    <Modal
      showModal={props.showAddFieldModal}
      setShowModal={props.setShowAddFieldModal}
    >
      <AddFieldModalInner {...props} />
    </Modal>
  );
}

export const DESIGNER_FIELDS: ({
  id: z.infer<typeof programApplicationFormFieldSchema>["type"]
  label: string;
  description: string;
  modal: React.ComponentType<any>;
} & (
    | { icon: Icon; thumbnail?: never }
    | { thumbnail: ReactNode; icon?: never }
  ))[] = [
    {
      id: "short-text",
      label: "Short Text",
      description: "Quick answers that don’t need much space",
      modal: ShortTextFieldModal,
      thumbnail: <ShortTextFieldThumbnail />,
    },
    {
      id: "long-text",
      label: "Long Text",
      description: "Let applicants share details in their own words",
      modal: LongTextFieldModal,
      thumbnail: <LongTextFieldThumbnail />,
    },
    {
      id: "select",
      label: "Dropdown",
      description: "For giving many options to choose from",
      modal: SelectFieldModal,
      thumbnail: <SelectFieldThumbnail />,
    },
    {
      id: "multiple-choice",
      label: "Multiple Choice",
      description: "For a shorter range of answers to a question",
      modal: MultipleChoiceFieldModal,
      thumbnail: <MultipleChoiceFieldThumbnail />,
    },
    {
      id: "website-and-socials",
      label: "Website and socials",
      description: "Collect website and social media links",
      modal: WebsiteAndSocialsFieldModal,
      icon: WebsiteAndSocialsFieldIcon,
    },
  ];

function AddFieldModalInner({
  setShowAddFieldModal,
  addIndex,
}: AddFieldModalProps) {
  const [modalState, setModalState] = useState<
    null | z.infer<typeof programApplicationFormFieldSchema>["type"]
  >(null);

  const { control, setValue } = usePageBuilderFormContext();
  const applicationFormData = useWatch({
    control,
    name: "applicationFormData",
  });

  const hasWebsiteAndSocialsField = applicationFormData.fields.some((field) => field.type === "website-and-socials");

  const fields = DESIGNER_FIELDS.filter((field) => field.id !== "website-and-socials" || !hasWebsiteAndSocialsField);

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Insert field
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {fields.map((field) => (
            <Fragment key={field.id}>
              <field.modal
                showModal={modalState === field.id}
                setShowModal={(show) =>
                  setModalState((s) =>
                    show ? field.id : s === field.id ? null : s,
                  )
                }
                onSubmit={(data) => {
                  setValue(
                    `applicationFormData.fields`,
                    [
                      ...applicationFormData.fields.slice(0, addIndex),
                      data,
                      ...applicationFormData.fields.slice(addIndex),
                    ],
                    { shouldDirty: true },
                  );

                  setModalState(null);
                  setShowAddFieldModal(false);
                }}
              />
              <button
                type="button"
                onClick={() => setModalState(field.id)}
                className={cn(
                  "flex flex-col gap-4 rounded-md border border-transparent bg-neutral-100 p-4 text-left outline-none ring-black/10 transition-all duration-150 hover:border-neutral-800 hover:ring focus-visible:border-neutral-800",
                  field.icon && "col-span-2 flex-row items-center",
                )}
              >
                {field.icon ? (
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                    <field.icon className="size-5 text-neutral-600" />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                    {field.thumbnail}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-neutral-900">
                    {field.label}
                  </span>
                  <p className="text-sm tracking-[-0.01em] text-neutral-500">
                    {field.description}
                  </p>
                </div>
              </button>
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}
