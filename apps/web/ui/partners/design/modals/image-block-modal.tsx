import { Button, Modal, useEnterSubmit, useMediaQuery } from "@dub/ui";
import { Dispatch, SetStateAction, useId } from "react";
import { useForm } from "react-hook-form";

type ImageBlockFormData = {
  url: string;
  alt: string;
  width: number;
  height: number;
};

type ImageBlockModalProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  defaultValues?: Partial<ImageBlockFormData>;
  onSubmit: (data: ImageBlockFormData) => void;
};

export function ImageBlockModal(props: ImageBlockModalProps) {
  return (
    <Modal showModal={props.showModal} setShowModal={props.setShowModal}>
      <ImageBlockModalInner {...props} />
    </Modal>
  );
}

function ImageBlockModalInner({
  setShowModal,
  onSubmit,
  defaultValues,
}: ImageBlockModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const { handleSubmit, register } = useForm<ImageBlockFormData>({
    defaultValues,
  });

  const { handleKeyDown } = useEnterSubmit();

  return (
    <>
      <div className="p-4 pt-3">
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Add image
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
          WIP
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

export function ImageBlockThumbnail() {
  return (
    <div className="relative aspect-[4/3] w-1/2 overflow-hidden rounded">
      <img
        src="https://assets.dub.co/misc/fun-thumbnail.jpg"
        className="object-cover"
      />
    </div>
  );
}
