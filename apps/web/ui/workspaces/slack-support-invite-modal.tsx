"use client";

import { SLACK_SUPPORT_INVITE_MAX_EMAILS } from "@/lib/constants/misc";
import {
  Button,
  Modal,
  MultiValueInput,
  type MultiValueInputRef,
} from "@dub/ui";
import { pluralize } from "@dub/utils";
import { useSession } from "next-auth/react";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

function normalizeInviteEmail(value: string) {
  return value.trim().toLowerCase();
}

export function SlackSupportInviteModal({
  showModal,
  setShowModal,
  workspaceSlug,
  onInviteSent,
  onInviteConflict,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  workspaceSlug: string;
  onInviteSent?: () => void;
  onInviteConflict?: () => void;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const [emails, setEmails] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const multiValueInputRef = useRef<MultiValueInputRef>(null);

  useEffect(() => {
    if (!showModal) {
      return;
    }
    const sessionEmail = session?.user?.email;
    const normalized = sessionEmail ? normalizeInviteEmail(sessionEmail) : "";
    setEmails(normalized ? [normalized] : []);
  }, [showModal, session?.user?.email]);

  const sessionEmailMissing =
    sessionStatus === "authenticated" && !session?.user?.email?.trim();

  const submitDisabled =
    inviting ||
    sessionStatus === "loading" ||
    sessionEmailMissing ||
    sessionStatus === "unauthenticated";

  const handleSubmit = async () => {
    const committed =
      multiValueInputRef.current?.commitPendingInput() ?? emails;
    if (committed.length === 0) {
      toast.error("Enter at least one email address.");
      return;
    }

    setInviting(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceSlug}/support/slack-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: committed }),
        },
      );
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(json?.error?.message ?? "Could not send Slack invite.");
        if (json?.error?.code === "conflict") {
          onInviteConflict?.();
        }
        return;
      }

      toast.success(
        "Check your email for your Slack Connect invitation to our team.",
      );
      setShowModal(false);
      onInviteSent?.();
    } finally {
      setInviting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md px-0"
    >
      <div className="border-border-subtle flex flex-col gap-1 border-b px-5 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <h2 className="text-content-emphasis text-base font-semibold">
            Request Slack invite
          </h2>
        </div>
        <p className="text-content-subtle text-sm font-normal">
          If your Slack email isn&apos;t your Dub email, use it below. Add
          teammates if needed.
        </p>
      </div>

      <div className="space-y-3 px-5 py-4 sm:px-6">
        {sessionStatus === "loading" ? (
          <p className="text-content-subtle text-sm">Loading your account…</p>
        ) : sessionEmailMissing ? (
          <p className="text-content-subtle text-sm">
            Your Dub account does not have an email address. Add one in your
            profile before requesting a Slack invite.
          </p>
        ) : (
          <>
            <label className="block">
              <span className="text-content-emphasis text-sm font-medium">
                Email addresses
              </span>
              <div className="mt-2">
                <MultiValueInput
                  ref={multiValueInputRef}
                  id="slack-support-invite-emails"
                  values={emails}
                  onChange={setEmails}
                  placeholder="you@company.com"
                  normalize={normalizeInviteEmail}
                  disabled={inviting}
                  autoFocus
                />
              </div>
              <p className="text-content-muted mt-2 text-xs">
                Separate multiple emails with commas, or paste a list (max{" "}
                {pluralize("email", SLACK_SUPPORT_INVITE_MAX_EMAILS)} per
                request).
              </p>
            </label>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          type="button"
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={() => setShowModal(false)}
          disabled={inviting}
        />
        <Button
          type="button"
          variant="primary"
          className="h-8 w-fit px-3"
          text="Send invite"
          loading={inviting}
          disabled={submitDisabled}
          onClick={() => void handleSubmit()}
        />
      </div>
    </Modal>
  );
}
