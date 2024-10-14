import useWorkspace from "@/lib/swr/use-workspace";
import { UtmTemplateProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import posthog from "posthog-js";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { mutate } from "swr";
import { UTMBuilder } from "../links/utm-builder";

function AddEditUtmTemplateModal({
  showAddEditUtmTemplateModal,
  setShowAddEditUtmTemplateModal,
  props,
}: {
  showAddEditUtmTemplateModal: boolean;
  setShowAddEditUtmTemplateModal: Dispatch<SetStateAction<boolean>>;
  props?: UtmTemplateProps;
}) {
  const { id } = props || {};
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { isSubmitting, isSubmitSuccessful, dirtyFields },
    watch,
  } = useForm<
    Pick<
      UtmTemplateProps,
      | "name"
      | "utm_campaign"
      | "utm_content"
      | "utm_medium"
      | "utm_source"
      | "utm_term"
      | "ref"
    >
  >({
    values: props,
  });

  const values = watch();

  const endpoint = useMemo(
    () =>
      id
        ? {
            method: "PATCH",
            url: `/api/utm-templates/${id}?workspaceId=${workspaceId}`,
            successMessage: "Successfully updated template!",
          }
        : {
            method: "POST",
            url: `/api/utm-templates?workspaceId=${workspaceId}`,
            successMessage: "Successfully added template!",
          },
    [id],
  );

  return (
    <Modal
      showModal={showAddEditUtmTemplateModal}
      setShowModal={setShowAddEditUtmTemplateModal}
    >
      <form
        onSubmit={handleSubmit(async (data) => {
          try {
            const res = await fetch(endpoint.url, {
              method: endpoint.method,
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data),
            });

            if (!res.ok) {
              const { error } = await res.json();
              toast.error(error.message);
              setError("root", { message: error.message });
              return;
            }

            posthog.capture(
              props ? "utm-template_edited" : "utm-template_created",
              {
                utmTemplateId: id,
                utmTemplateName: data.name,
              },
            );
            await mutate(`/api/utm-templates?workspaceId=${workspaceId}`);
            toast.success(endpoint.successMessage);
            setShowAddEditUtmTemplateModal(false);
          } catch (e) {
            toast.error("Failed to save template");
            setError("root", { message: "Failed to save template" });
          }
        })}
        className="px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">
            {props ? "Edit UTM Template" : "Create UTM Template"}
          </h3>
        </div>
        <div className="mt-6">
          <label htmlFor="name">
            <span className="block text-sm font-medium text-gray-700">
              Template Name
            </span>
            <div className="mt-2 flex rounded-md shadow-sm">
              <input
                type="text"
                autoFocus={!isMobile}
                autoComplete="off"
                className="block w-full rounded-md border-gray-300 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-gray-500 sm:text-sm"
                placeholder="New Template"
                {...register("name", { required: true })}
              />
            </div>
          </label>
        </div>

        <div className="mt-6">
          <span className="mb-2 block text-sm font-medium text-gray-700">
            Parameters
          </span>
          <UTMBuilder
            values={values}
            onChange={(key, value) => {
              setValue(key, value, { shouldDirty: true });
            }}
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            // Check all dirty fields because `isDirty` doesn't seem to register for `ref`
            disabled={!Object.entries(dirtyFields).some(([_, dirty]) => dirty)}
            loading={isSubmitting || isSubmitSuccessful}
            text={props ? "Save changes" : "Create template"}
            className="h-9 w-fit"
          />
        </div>
      </form>
    </Modal>
  );
}

function AddUtmTemplateButton({
  setShowAddEditUtmTemplateModal,
}: {
  setShowAddEditUtmTemplateModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div>
      <Button
        variant="primary"
        text="Create template"
        className="h-9 rounded-lg"
        onClick={() => setShowAddEditUtmTemplateModal(true)}
      />
    </div>
  );
}

export function useAddEditUtmTemplateModal({
  props,
}: { props?: UtmTemplateProps } = {}) {
  const [showAddEditUtmTemplateModal, setShowAddEditUtmTemplateModal] =
    useState(false);

  const AddEditUtmTemplateModalCallback = useCallback(() => {
    return (
      <AddEditUtmTemplateModal
        showAddEditUtmTemplateModal={showAddEditUtmTemplateModal}
        setShowAddEditUtmTemplateModal={setShowAddEditUtmTemplateModal}
        props={props}
      />
    );
  }, [showAddEditUtmTemplateModal, setShowAddEditUtmTemplateModal]);

  const AddUtmTemplateButtonCallback = useCallback(() => {
    return (
      <AddUtmTemplateButton
        setShowAddEditUtmTemplateModal={setShowAddEditUtmTemplateModal}
      />
    );
  }, [setShowAddEditUtmTemplateModal]);

  return useMemo(
    () => ({
      setShowAddEditUtmTemplateModal,
      AddEditUtmTemplateModal: AddEditUtmTemplateModalCallback,
      AddUtmTemplateButton: AddUtmTemplateButtonCallback,
    }),
    [
      setShowAddEditUtmTemplateModal,
      AddEditUtmTemplateModalCallback,
      AddUtmTemplateButtonCallback,
    ],
  );
}
