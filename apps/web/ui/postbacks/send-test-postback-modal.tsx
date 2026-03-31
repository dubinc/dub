"use client";

import { partnerProfileFetch } from "@/lib/api/partner-profile/client";
import { POSTBACK_TRIGGER_DESCRIPTIONS } from "@/lib/postback/constants";
import { sendTestPostbackInputSchema } from "@/lib/postback/schemas";
import { mutatePrefix } from "@/lib/swr/mutate";
import { PostbackTrigger } from "@/lib/types";
import { Button, Combobox, ComboboxOption, Modal } from "@dub/ui";
import { Dispatch, SetStateAction, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";

type FormData = z.infer<typeof sendTestPostbackInputSchema>;

interface SendTestPostbackModalProps {
  postbackId: string;
  triggers: string[];
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void;
}

export function SendTestPostbackModal({
  postbackId,
  triggers,
  showModal,
  setShowModal,
  onSuccess,
}: SendTestPostbackModalProps) {
  const options = useMemo(
    () =>
      triggers.map((t) => ({
        value: t,
        label: POSTBACK_TRIGGER_DESCRIPTIONS[t as PostbackTrigger] ?? t,
      })),
    [triggers],
  );

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      event: "" as FormData["event"],
    },
  });

  const selectedEvent = watch("event");

  const selectedOption: ComboboxOption | null = selectedEvent
    ? options.find((o) => o.value === selectedEvent) ?? null
    : null;

  useEffect(() => {
    if (showModal) {
      reset({
        event: "" as FormData["event"],
      });
    }
  }, [showModal, reset]);

  const onSubmit = async (data: FormData) => {
    await partnerProfileFetch(
      "@post/api/partner-profile/postbacks/:postbackId/send-test",
      {
        params: {
          postbackId,
        },
        body: {
          event: data.event,
        },
        onSuccess: async () => {
          setShowModal(false);
          await mutatePrefix("/api/partner-profile/postbacks");
          toast.success("Test event sent successfully");
          onSuccess?.();
        },
        onError: ({ error }) => {
          toast.error(error.error.message);
        },
      },
    );
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium leading-none">
          Send test postback event
        </h3>
        <p className="text-sm text-neutral-500">
          Choose an event to send a test payload to your endpoint.
        </p>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
            <div className="mt-2">
              <Combobox
                options={options}
                selected={selectedOption}
                setSelected={(opt) =>
                  setValue("event", (opt?.value as FormData["event"]) ?? "", {
                    shouldDirty: true,
                  })
                }
                placeholder="Select an event"
                matchTriggerWidth
                caret
              />
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
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
                text="Send test event"
                className="h-9 w-fit"
                loading={isSubmitting}
                disabled={!selectedEvent || isSubmitting}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}
