"use client";

import { Modal } from "@dub/ui";
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useWatch } from "react-hook-form";
import { useBrandingFormContext } from "../branding-form";
import { AccordionBlockThumbnail } from "./accordion-block-modal";
import { FilesBlockThumbnail } from "./files-block-modal";
import { ImageBlockThumbnail } from "./image-block-modal";
import { TextBlockModal, TextBlockThumbnail } from "./text-block-modal";

type AddBlockModalProps = {
  showAddBlockModal: boolean;
  setShowAddBlockModal: Dispatch<SetStateAction<boolean>>;
};

function AddBlockModal(props: AddBlockModalProps) {
  return (
    <Modal
      showModal={props.showAddBlockModal}
      setShowModal={props.setShowAddBlockModal}
    >
      <AddBlockModalInner {...props} />
    </Modal>
  );
}

const Blocks = [
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
    modal: TextBlockModal,
    thumbnail: <ImageBlockThumbnail />,
  },
  {
    id: "files",
    label: "Files",
    description: "Provide helpful files to potential partners",
    modal: TextBlockModal,
    thumbnail: <FilesBlockThumbnail />,
  },
  {
    id: "accordion",
    label: "Accordion",
    description: "Expanding and collapsing, great for FAQs",
    modal: TextBlockModal,
    thumbnail: <AccordionBlockThumbnail />,
  },
] as const;

function AddBlockModalInner({ setShowAddBlockModal }: AddBlockModalProps) {
  const [modalState, setModalState] = useState<
    null | "text" | "image" | "files" | "accordion"
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
          {Blocks.map((block) => (
            <Fragment key={block.id}>
              <block.modal
                showModal={modalState === block.id}
                setShowModal={(show) =>
                  setModalState((s) =>
                    show ? block.id : s === block.id ? null : s,
                  )
                }
                onSubmit={(data) => {
                  alert("added block");
                  setModalState(null);
                  setShowAddBlockModal(false);
                }}
              />
              <button
                type="button"
                onClick={() => setModalState(block.id)}
                className="flex flex-col gap-4 rounded-md border border-transparent bg-neutral-100 p-4 text-left outline-none ring-black/10 transition-all duration-150 hover:border-neutral-800 hover:ring focus-visible:border-neutral-800"
              >
                <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                  {block.thumbnail}
                </div>
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

export function useAddBlockModal() {
  const [showAddBlockModal, setShowAddBlockModal] = useState(false);

  const AddBlockModalCallback = useCallback(() => {
    return (
      <AddBlockModal
        showAddBlockModal={showAddBlockModal}
        setShowAddBlockModal={setShowAddBlockModal}
      />
    );
  }, [showAddBlockModal, setShowAddBlockModal]);

  return useMemo(
    () => ({
      setShowAddBlockModal,
      AddBlockModal: AddBlockModalCallback,
    }),
    [setShowAddBlockModal, AddBlockModalCallback],
  );
}
