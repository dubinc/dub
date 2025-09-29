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
import { PageBuilderFormData, usePageBuilderFormContext } from "../page-builder-form";

type EditApplicationHeroModalProps = {
  showEditApplicationHeroModal: boolean;
  setShowEditApplicationHeroModal: Dispatch<SetStateAction<boolean>>;
};

function EditApplicationHeroModal(props: EditApplicationHeroModalProps) {
  return (
    <Modal
      showModal={props.showEditApplicationHeroModal}
      setShowModal={props.setShowEditApplicationHeroModal}
    >
      <EditApplicationHeroModalInner {...props} />
    </Modal>
  );
}

function EditApplicationHeroModalInner({ setShowEditApplicationHeroModal }: EditApplicationHeroModalProps) {
  const id = useId();
  const { isMobile } = useMediaQuery();
  const { program } = useProgram();

  const { getValues: getValuesParent, setValue: setValueParent } =
    usePageBuilderFormContext();

  const {
    register,
    handleSubmit,
    formState: { isDirty },
  } = useForm<Pick<PageBuilderFormData, "applicationFormData">>({
    values: {
      applicationFormData: getValuesParent("applicationFormData"),
    },
  });

  const { handleKeyDown } = useEnterSubmit();

  return (
    <>
      <form
        className="p-4 pt-3"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(({ applicationFormData }) => {
            setValueParent("applicationFormData", applicationFormData, {
              shouldDirty: true,
            });
            setShowEditApplicationHeroModal(false);
          })(e);
        }}
      >
        <h3 className="text-base font-semibold leading-6 text-neutral-800">
          Title and Description
        </h3>

        <div className="mt-4 flex flex-col gap-6">
          {/* Section label */}
          <div>
            <label
              htmlFor={`${id}-label`}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700"
            >
              Section label
            </label>
            <div className="mt-2 rounded-md shadow-sm">
              <input
                id={`${id}-label`}
                type="text"
                placeholder={program?.name ? `${program.name} Affiliate Program` : "Affiliate Program"}
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("applicationFormData.label")}
              />
            </div>
          </div>

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
                placeholder={program ? `Apply to ${program.name}` : "Apply now"}
                autoFocus={!isMobile}
                className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("applicationFormData.title")}
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
                placeholder={`Submit your application to join the ${program?.name} affiliate program and start earning commissions for your referrals.`}
                className="block max-h-32 min-h-16 w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                {...register("applicationFormData.description")}
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
            onClick={() => setShowEditApplicationHeroModal(false)}
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

export function useEditApplicationHeroModal() {
  const [showEditApplicationHeroModal, setShowEditApplicationHeroModal] = useState(false);

  const EditApplicationHeroModalCallback = useCallback(() => {
    return (
      <EditApplicationHeroModal
        showEditApplicationHeroModal={showEditApplicationHeroModal}
        setShowEditApplicationHeroModal={setShowEditApplicationHeroModal}
      />
    );
  }, [showEditApplicationHeroModal, setShowEditApplicationHeroModal]);

  return useMemo(
    () => ({
      setShowEditApplicationHeroModal,
      EditApplicationHeroModal: EditApplicationHeroModalCallback,
    }),
    [setShowEditApplicationHeroModal, EditApplicationHeroModalCallback],
  );
}
