"use client";

import useProgram from "@/lib/swr/use-program";
import { Button, Modal, useEnterSubmit, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { BrandingFormData, useBrandingFormContext } from "../branding-form";

type EditHeroModalProps = {
  showEditHeroModal: boolean;
  setShowEditHeroModal: Dispatch<SetStateAction<boolean>>;
};

function EditHeroModal(props: EditHeroModalProps) {
  return (
    <Modal
      showModal={props.showEditHeroModal}
      setShowModal={props.setShowEditHeroModal}
    >
      <EditHeroModalInner {...props} />
    </Modal>
  );
}

function EditHeroModalInner({ setShowEditHeroModal }: EditHeroModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const { program } = useProgram();

  const { getValues: getValuesParent, setValue: setValueParent } =
    useBrandingFormContext();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<Pick<BrandingFormData, "landerData">>({
    values: {
      landerData: getValuesParent("landerData"),
    },
  });

  const { handleKeyDown } = useEnterSubmit();

  return (
    <>
      <form
        className="p-4 pt-3"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(({ landerData }) => {
            setValueParent("landerData", landerData, {
              shouldDirty: true,
            });
            setShowEditHeroModal(false);
          })(e);
        }}
      >
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Title and Description
        </h3>

        <div className="mt-4 flex flex-col gap-6">
          {/* Title */}
          <div>
            <label
              htmlFor={`${id}-title`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Title
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-title`}
                type="text"
                placeholder={`Join the ${program?.name} affiliate program`}
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("landerData.title")}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor={`${id}-description`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Description
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <textarea
                id={`${id}-description`}
                rows={3}
                maxLength={240}
                onKeyDown={handleKeyDown}
                placeholder={`Share ${program?.name} with your audience and for each subscription generated through your referral, you'll earn a share of the revenue on any plans they purchase.`}
                className="block max-h-32 min-h-16 w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("landerData.description")}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => setShowEditHeroModal(false)}
          />
          <Button
            type="submit"
            variant="primary"
            text="Save"
            className="h-9 w-fit"
            disabled={!isDirty}
          />
        </div>
      </form>
    </>
  );
}

export function useEditHeroModal() {
  const [showEditHeroModal, setShowEditHeroModal] = useState(false);

  const EditHeroModalCallback = useCallback(() => {
    return (
      <EditHeroModal
        showEditHeroModal={showEditHeroModal}
        setShowEditHeroModal={setShowEditHeroModal}
      />
    );
  }, [showEditHeroModal, setShowEditHeroModal]);

  return useMemo(
    () => ({
      setShowEditHeroModal,
      EditHeroModal: EditHeroModalCallback,
    }),
    [setShowEditHeroModal, EditHeroModalCallback],
  );
}
