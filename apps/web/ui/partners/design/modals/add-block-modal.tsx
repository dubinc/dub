"use client";

import { programLanderBlockSchema } from "@/lib/zod/schemas/program-lander";
import { Calculator, Icon, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { Dispatch, Fragment, ReactNode, SetStateAction, useState } from "react";
import { useWatch } from "react-hook-form";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { useBrandingFormContext } from "../branding-form";
import {
  AccordionBlockModal,
  AccordionBlockThumbnail,
} from "./accordion-block-modal";
import { EarningsCalculatorBlockModal } from "./earnings-calculator-block-modal";
import { FilesBlockModal, FilesBlockThumbnail } from "./files-block-modal";
import { ImageBlockModal, ImageBlockThumbnail } from "./image-block-modal";
import { TextBlockModal, TextBlockThumbnail } from "./text-block-modal";

type AddBlockModalProps = {
  showAddBlockModal: boolean;
  setShowAddBlockModal: Dispatch<SetStateAction<boolean>>;
  addIndex: number;
};

export function AddBlockModal(props: AddBlockModalProps) {
  return (
    <Modal
      showModal={props.showAddBlockModal}
      setShowModal={props.setShowAddBlockModal}
    >
      <AddBlockModalInner {...props} />
    </Modal>
  );
}

export const DESIGNER_BLOCKS: ({
  id: z.infer<typeof programLanderBlockSchema>["type"];
  label: string;
  description: string;
  modal: React.ComponentType<any>;
} & (
  | { icon: Icon; thumbnail?: never }
  | { thumbnail: ReactNode; icon?: never }
))[] = [
  {
    id: "text",
    label: "Text",
    description: "Share more program information and content",
    modal: TextBlockModal,
    thumbnail: <TextBlockThumbnail />,
  },
  {
    id: "image",
    label: "Image",
    description: "Add nice visuals to accompany your content",
    modal: ImageBlockModal,
    thumbnail: <ImageBlockThumbnail />,
  },
  {
    id: "files",
    label: "Files",
    description: "Provide helpful files to potential partners",
    modal: FilesBlockModal,
    thumbnail: <FilesBlockThumbnail />,
  },
  {
    id: "accordion",
    label: "Accordion",
    description: "Expanding and collapsing, great for FAQs",
    modal: AccordionBlockModal,
    thumbnail: <AccordionBlockThumbnail />,
  },
  {
    id: "earnings-calculator",
    label: "Earnings Calculator",
    description: "Show partners how much they can earn.",
    modal: EarningsCalculatorBlockModal,
    icon: Calculator,
  },
];

function AddBlockModalInner({
  setShowAddBlockModal,
  addIndex,
}: AddBlockModalProps) {
  const [modalState, setModalState] = useState<
    null | z.infer<typeof programLanderBlockSchema>["type"]
  >(null);

  const { control, setValue } = useBrandingFormContext();
  const landerData = useWatch({
    control,
    name: "landerData",
  });

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Insert block
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {DESIGNER_BLOCKS.map((block) => (
            <Fragment key={block.id}>
              <block.modal
                showModal={modalState === block.id}
                setShowModal={(show) =>
                  setModalState((s) =>
                    show ? block.id : s === block.id ? null : s,
                  )
                }
                onSubmit={(data) => {
                  setValue(
                    `landerData.blocks`,
                    [
                      ...landerData.blocks.slice(0, addIndex),
                      { type: block.id, id: uuid(), data },
                      ...landerData.blocks.slice(addIndex),
                    ],
                    { shouldDirty: true },
                  );
                  setModalState(null);
                  setShowAddBlockModal(false);
                }}
              />
              <button
                type="button"
                onClick={() => setModalState(block.id)}
                className={cn(
                  "flex flex-col gap-4 rounded-md border border-transparent bg-neutral-100 p-4 text-left outline-none ring-black/10 transition-all duration-150 hover:border-neutral-800 hover:ring focus-visible:border-neutral-800",
                  block.icon && "col-span-2 flex-row items-center",
                )}
              >
                {block.icon ? (
                  <div className="flex size-12 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                    <block.icon className="size-5 text-neutral-600" />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                    {block.thumbnail}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-neutral-900">
                    {block.label}
                  </span>
                  <p className="text-sm tracking-[-0.01em] text-neutral-500">
                    {block.description}
                  </p>
                </div>
              </button>
            </Fragment>
          ))}

          {/* <div className="col-span-2 h-20 rounded-md bg-neutral-100" /> */}
        </div>
      </div>
    </>
  );
}
