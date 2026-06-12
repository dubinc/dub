"use client";

import { Button, Modal, useMediaQuery } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

type ForwardDnsInstructionsModalProps = {
  domain: string;
  recordType: "A" | "CNAME";
  workspaceId: string;
};

function ForwardDnsInstructionsModal({
  showModal,
  setShowModal,
  domain,
  recordType,
  workspaceId,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
} & ForwardDnsInstructionsModalProps) {
  const { isMobile } = useMediaQuery();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(
        `/api/domains/${encodeURIComponent(domain)}/forward-instructions?workspaceId=${workspaceId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, recordType }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Failed to send instructions.");
        return;
      }
      toast.success(`DNS instructions sent to ${email}`);
      setShowModal(false);
      setEmail("");
    } catch {
      toast.error("Failed to send instructions.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-1 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Forward DNS instructions</h3>
        <p className="text-sm text-neutral-500">
          Enter an email address to send the DNS records needed to configure{" "}
          <span className="font-medium text-neutral-700">{domain}</span>.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-neutral-50 px-4 py-6 sm:px-6"
      >
        <div>
          <label
            htmlFor="forward-email"
            className="block text-sm font-medium text-neutral-700"
          >
            Email address
          </label>
          <input
            id="forward-email"
            type="email"
            required
            autoFocus={!isMobile}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            className="mt-1 block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
          />
        </div>

        <Button
          type="submit"
          text="Send instructions"
          loading={loading}
          disabled={!email}
        />
      </form>
    </Modal>
  );
}

export function useForwardDnsInstructionsModal(
  props: ForwardDnsInstructionsModalProps,
) {
  const [showModal, setShowModal] = useState(false);

  const Modal = useCallback(
    () => (
      <ForwardDnsInstructionsModal
        showModal={showModal}
        setShowModal={setShowModal}
        {...props}
      />
    ),
    [showModal, props.domain, props.recordType, props.workspaceId],
  );

  return useMemo(
    () => ({
      setShowForwardDnsModal: setShowModal,
      ForwardDnsInstructionsModal: Modal,
    }),
    [setShowModal, Modal],
  );
}
