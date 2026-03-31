"use client";

import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useUser from "@/lib/swr/use-user";
import { Button, Modal, useEnterSubmit, useMediaQuery } from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useCampaignFormContext } from "./campaign-form-context";

interface SendEmailPreviewModalProps {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  campaignId: string;
}

function SendEmailPreviewModal({
  showModal,
  setShowModal,
  campaignId,
}: SendEmailPreviewModalProps) {
  const { user } = useUser();
  const { isMobile } = useMediaQuery();
  const { handleKeyDown } = useEnterSubmit();
  const { control } = useCampaignFormContext();
  const { isSubmitting, makeRequest } = useApiMutation();
  const [emailAddresses, setEmailAddresses] = useState(user?.email ?? "");

  const [subject, preview, bodyJson, from] = useWatch({
    control,
    name: ["subject", "preview", "bodyJson", "from"],
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailAddresses.trim()) {
      toast.error("Please enter at least one email address.");
      return;
    }

    if (!subject || !bodyJson) {
      toast.error(
        "Please ensure both subject and body are filled in the campaign form.",
      );
      return;
    }

    const emails = emailAddresses
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (emails.length === 0) {
      toast.error("Please enter valid email addresses.");
      return;
    }

    await makeRequest(`/api/campaigns/${campaignId}/preview`, {
      method: "POST",
      body: {
        subject,
        preview,
        bodyJson,
        from,
        emailAddresses: emails,
      },
      onSuccess: () => {
        toast.success("Preview email sent!");
        setShowModal(false);
        setEmailAddresses("");
      },
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="truncate text-lg font-medium">Send preview email</h3>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-4 px-4 py-6 text-left sm:px-6">
            <div>
              <label
                htmlFor="emailAddresses"
                className="text-content-emphasis mb-2 block text-sm font-medium"
              >
                Email addresses
              </label>
              <textarea
                id="emailAddresses"
                name="emailAddresses"
                placeholder="Separate multiple addresses with commas"
                autoFocus={!isMobile}
                required
                value={emailAddresses}
                onChange={(e) => setEmailAddresses(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
                className="border-border-subtle focus:border-border-emphasis focus:ring-border-emphasis block w-full resize-none rounded-md shadow-sm sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              text="Send preview"
              loading={isSubmitting}
              disabled={!emailAddresses.trim()}
              className="h-8 w-fit"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useSendEmailPreviewModal({
  campaignId,
}: {
  campaignId: string;
}) {
  const [showSendEmailPreviewModal, setShowSendEmailPreviewModal] =
    useState(false);

  return {
    showSendEmailPreviewModal,
    setShowSendEmailPreviewModal,
    SendEmailPreviewModal: () => (
      <SendEmailPreviewModal
        showModal={showSendEmailPreviewModal}
        setShowModal={setShowSendEmailPreviewModal}
        campaignId={campaignId}
      />
    ),
  };
}
