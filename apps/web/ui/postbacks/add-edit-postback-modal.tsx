"use client";

import { partnerProfileFetch } from "@/lib/api/partner-profile/client";
import {
  POSTBACK_TRIGGER_DESCRIPTIONS,
  POSTBACK_TRIGGERS,
} from "@/lib/postback/constants";
import {
  createPostbackInputSchema,
  postbackSchema,
} from "@/lib/postback/schemas";
import { mutatePrefix } from "@/lib/swr/mutate";
import { PostbackTrigger } from "@/lib/types";
import { Badge, Button, Combobox, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type PostbackForEdit = z.infer<typeof postbackSchema>;

type FormData = z.infer<typeof createPostbackInputSchema>;

interface AddEditPostbackModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  postback: PostbackForEdit | null;
  onSuccess: () => void;
  onCreatedWithSecret?: (secret: string) => void;
}

function AddEditPostbackModal({
  showModal,
  setShowModal,
  postback,
  onSuccess,
  onCreatedWithSecret,
}: AddEditPostbackModalProps) {
  const { isMobile } = useMediaQuery();
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      url: "",
      triggers: [],
    },
  });

  const triggerOptions = POSTBACK_TRIGGERS.map((t) => ({
    value: t,
    label: POSTBACK_TRIGGER_DESCRIPTIONS[t],
  }));

  const isEdit = !!postback;
  const triggers = watch("triggers") ?? [];

  const selectedTriggers = useMemo(
    () =>
      triggers
        .map((t) => triggerOptions.find((o) => o.value === t))
        .filter(Boolean) as { value: string; label: string }[],
    [triggers, triggerOptions],
  );

  useEffect(() => {
    if (showModal) {
      reset({
        name: postback?.name ?? "",
        url: postback?.url ?? "",
        triggers: (postback?.triggers ?? []) as PostbackTrigger[],
      });
    }
  }, [showModal, postback, reset]);

  async function onSubmit(data: FormData) {
    // Update postback
    if (postback) {
      await partnerProfileFetch(
        "@patch/api/partner-profile/postbacks/:postbackId",
        {
          params: {
            postbackId: postback.id,
          },
          body: {
            name: data.name,
            url: data.url,
            triggers: data.triggers,
          },
          onSuccess: async () => {
            toast.success("Postback updated");
            setShowModal(false);
            await mutatePrefix("/api/partner-profile/postbacks");
            onSuccess();
          },
          onError: ({ error }) => {
            toast.error(error.error.message);
          },
        },
      );

      return;
    }

    // Create postback
    await partnerProfileFetch("/api/partner-profile/postbacks", {
      body: {
        name: data.name,
        url: data.url,
        triggers: data.triggers,
      },
      onSuccess: async ({ data: createdPostback }) => {
        toast.success("Postback created");

        if (createdPostback?.secret) {
          onCreatedWithSecret?.(createdPostback.secret);
        }

        setShowModal(false);
        onSuccess();

        await mutatePrefix("/api/partner-profile/postbacks");
      },
      onError: ({ error }) => {
        toast.error(error.error.message);
      },
    });
  }

  return (
    <>
      <Modal showModal={showModal} setShowModal={setShowModal}>
        <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
          <h3 className="text-lg font-medium leading-none">
            {isEdit ? "Edit" : "Add"} Postback
          </h3>
        </div>

        <div className="bg-neutral-50">
          <form
            onSubmit={(e) => {
              e.stopPropagation();
              return handleSubmit(onSubmit)(e);
            }}
          >
            <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
              <div>
                <label
                  htmlFor="postback-name"
                  className="text-content-emphasis block text-sm font-medium"
                >
                  Name
                </label>
                <input
                  id="postback-name"
                  type="text"
                  autoComplete="off"
                  className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="My postback"
                  autoFocus={!isMobile}
                  disabled={isSubmitting}
                  {...register("name")}
                />
              </div>

              <div>
                <label
                  htmlFor="postback-url"
                  className="text-content-emphasis block text-sm font-medium"
                >
                  Destination URL
                </label>
                <input
                  id="postback-url"
                  type="url"
                  autoComplete="off"
                  className="border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  placeholder="https://your-server.com/webhook"
                  disabled={isSubmitting}
                  {...register("url")}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Must be a valid HTTPS URL. We will send POST requests to this
                  URL.
                </p>
              </div>

              <div>
                <label className="text-content-emphasis mb-1 block text-sm font-medium">
                  Events
                </label>
                <Combobox
                  multiple
                  selected={selectedTriggers}
                  setSelected={(opts) => {
                    setValue(
                      "triggers",
                      opts.map((o) => o.value),
                      { shouldDirty: true },
                    );
                  }}
                  options={triggerOptions}
                  searchPlaceholder="Search events..."
                  buttonProps={{
                    className: cn(
                      "h-auto min-h-10 w-full justify-start px-2.5 py-1.5 font-normal border-neutral-200 bg-white",
                      selectedTriggers.length === 0 && "text-neutral-400",
                    ),
                    disabled: isSubmitting,
                  }}
                  matchTriggerWidth
                  caret={
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 text-neutral-400" />
                  }
                  open={isOpen}
                  onOpenChange={setIsOpen}
                >
                  {selectedTriggers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedTriggers.map((opt) => (
                        <Badge
                          key={opt.value}
                          variant="gray"
                          className="animate-fade-in"
                        >
                          {opt.label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="block py-0.5">Select events...</span>
                  )}
                </Combobox>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                text={isEdit ? "Save changes" : "Create postback"}
                className="h-9 w-fit"
                loading={isSubmitting}
                disabled={!isDirty}
              />
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}

interface AddEditPostbackModalWrapperProps {
  postback: PostbackForEdit | null | undefined;
  onSuccess?: () => void;
  onCreatedWithSecret?: (secret: string) => void;
  closePostbackModal: () => void;
}

function AddEditPostbackModalWrapper({
  postback,
  onSuccess,
  onCreatedWithSecret,
  closePostbackModal,
}: AddEditPostbackModalWrapperProps) {
  if (postback === undefined) return null;

  return (
    <AddEditPostbackModal
      showModal
      postback={postback}
      onSuccess={() => onSuccess?.()}
      onCreatedWithSecret={onCreatedWithSecret}
      setShowModal={(show) => {
        if (!show) {
          closePostbackModal();
        }
      }}
    />
  );
}

export function useAddEditPostbackModal(
  onSuccess?: () => void,
  onCreatedWithSecret?: (secret: string) => void,
) {
  const [postback, setPostback] = useState<PostbackForEdit | null | undefined>(
    undefined,
  );

  function openAddPostbackModal() {
    setPostback(null);
  }

  function openEditPostbackModal(postbackToEdit: PostbackForEdit) {
    setPostback(postbackToEdit);
  }

  function closePostbackModal() {
    setPostback(undefined);
  }

  return {
    openAddPostbackModal,
    openEditPostbackModal,
    closePostbackModal,
    AddEditPostbackModal: (
      <AddEditPostbackModalWrapper
        postback={postback}
        onSuccess={onSuccess}
        onCreatedWithSecret={onCreatedWithSecret}
        closePostbackModal={closePostbackModal}
      />
    ),
    isAddEditPostbackModalOpen: postback !== undefined,
  };
}
