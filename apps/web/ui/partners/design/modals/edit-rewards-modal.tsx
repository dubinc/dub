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

type EditRewardsModalProps = {
  showEditRewardsModal: boolean;
  setShowEditRewardsModal: Dispatch<SetStateAction<boolean>>;
};

function EditRewardsModal(props: EditRewardsModalProps) {
  return (
    <Modal
      showModal={props.showEditRewardsModal}
      setShowModal={props.setShowEditRewardsModal}
    >
      <EditRewardsModalInner {...props} />
    </Modal>
  );
}

function EditRewardsModalInner({
  setShowEditRewardsModal,
}: EditRewardsModalProps) {
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
            setShowEditRewardsModal(false);
          })(e);
        }}
      >
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Rewards
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          Select the rewards and discount shown to new applicants on your
          landing page. These apply only to new partners after approval.
        </p>

        <div className="mt-4 flex flex-col gap-6">
          {/* Title */}
          {/* <div>
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
          </div> */}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            text="Cancel"
            className="h-9 w-fit"
            onClick={() => setShowEditRewardsModal(false)}
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

export function useEditRewardsModal() {
  const [showEditRewardsModal, setShowEditRewardsModal] = useState(false);

  const EditRewardsModalCallback = useCallback(() => {
    return (
      <EditRewardsModal
        showEditRewardsModal={showEditRewardsModal}
        setShowEditRewardsModal={setShowEditRewardsModal}
      />
    );
  }, [showEditRewardsModal, setShowEditRewardsModal]);

  return useMemo(
    () => ({
      setShowEditRewardsModal,
      EditRewardsModal: EditRewardsModalCallback,
    }),
    [setShowEditRewardsModal, EditRewardsModalCallback],
  );
}
