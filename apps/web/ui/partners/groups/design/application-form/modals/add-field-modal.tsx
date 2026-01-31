"use client";

import { programApplicationFormFieldSchema } from "@/lib/zod/schemas/program-application-form";
import {
  Globe,
  Icon,
  ImageIcon,
  InputField,
  ListCheckbox,
  Modal,
  Select,
  TextArea,
} from "@dub/ui";
import { Dispatch, Fragment, SetStateAction, useState } from "react";
import { useWatch } from "react-hook-form";
import * as z from "zod/v4";
import { useBrandingFormContext } from "../../branding-form";
import { ImageUploadFieldModal } from "./image-upload-field-modal";
import { LongTextFieldModal } from "./long-text-field-modal";
import { MultipleChoiceFieldModal } from "./multiple-choice-field-modal";
import { SelectFieldModal } from "./select-field-modal";
import { ShortTextFieldModal } from "./short-text-field-modal";
import { WebsiteAndSocialsFieldModal } from "./website-and-socials-field-modal";

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
      className="max-w-lg"
    >
      <AddFieldModalInner {...props} />
    </Modal>
  );
}

export const DESIGNER_FIELDS: {
  id: z.infer<typeof programApplicationFormFieldSchema>["type"];
  label: string;
  icon: Icon;
  modal: React.ComponentType<any>;
}[] = [
  {
    id: "short-text",
    label: "Short text",
    icon: InputField,
    modal: ShortTextFieldModal,
  },
  {
    id: "long-text",
    label: "Long text",
    icon: TextArea,
    modal: LongTextFieldModal,
  },
  {
    id: "select",
    label: "Dropdown",
    icon: Select,
    modal: SelectFieldModal,
  },
  {
    id: "multiple-choice",
    label: "Multiple choice",
    icon: ListCheckbox,
    modal: MultipleChoiceFieldModal,
  },
  {
    id: "image-upload",
    label: "Image uploads",
    icon: ImageIcon,
    modal: ImageUploadFieldModal,
  },
  {
    id: "website-and-socials",
    label: "Website and socials",
    icon: Globe,
    modal: WebsiteAndSocialsFieldModal,
  },
];

function AddFieldModalInner({
  setShowAddFieldModal,
  addIndex,
}: AddFieldModalProps) {
  const [modalState, setModalState] = useState<
    null | z.infer<typeof programApplicationFormFieldSchema>["type"]
  >(null);

  const { control, setValue } = useBrandingFormContext();
  const applicationFormData = useWatch({
    control,
    name: "applicationFormData",
  });

  const hasWebsiteAndSocialsField = applicationFormData.fields.some(
    (field) => field.type === "website-and-socials",
  );

  const fields = DESIGNER_FIELDS.filter(
    (field) => field.id !== "website-and-socials" || !hasWebsiteAndSocialsField,
  );

  return (
    <div className="p-4 pt-3">
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Insert field
        </h3>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {fields.map((field) => (
          <Fragment key={field.id}>
            <field.modal
              showModal={modalState === field.id}
              setShowModal={(show: boolean) =>
                setModalState((s) =>
                  show ? field.id : s === field.id ? null : s,
                )
              }
              onSubmit={(data: any) => {
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
              className="flex items-center gap-2.5 rounded-lg border border-transparent bg-neutral-100 p-1 text-left outline-none transition-all duration-150 hover:border-neutral-200 hover:bg-neutral-200/50"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
                <field.icon className="size-5 text-neutral-600" />
              </div>
              <span className="text-sm font-medium text-neutral-600">
                {field.label}
              </span>
            </button>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
