"use client";

import { Button, Copy, Modal, Tick, useCopyToClipboard } from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";

interface PostbackSecretModalProps {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  secret: string;
}

function PostbackSecretModal({
  showModal,
  setShowModal,
  secret,
}: PostbackSecretModalProps) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Signing secret</h3>
        <p className="text-sm text-neutral-500">
          Copy it and store it somewhere safe. You will need it to verify
          postback signatures.
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-neutral-800">
            Signing secret
          </h2>
          <div className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white p-2">
            <p className="truncate font-mono text-sm text-neutral-500">
              {secret}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.promise(copyToClipboard(secret), {
                  success: "Secret copied to clipboard!",
                });
              }}
              type="button"
              className="text-neutral-90 flex h-7 shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50"
            >
              {copied ? (
                <Tick className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <Button
          text="Done"
          variant="secondary"
          onClick={() => setShowModal(false)}
          className="w-full"
        />
      </div>
    </Modal>
  );
}

export function usePostbackSecretModal() {
  const [state, setState] = useState<{ show: boolean; secret: string }>({
    show: false,
    secret: "",
  });

  function openPostbackSecretModal(secret: string) {
    setState({ show: true, secret });
  }

  function closePostbackSecretModal() {
    setState({ show: false, secret: "" });
  }

  function PostbackSecretModalWrapper() {
    if (!state.show) return null;

    return (
      <PostbackSecretModal
        showModal={state.show}
        setShowModal={(show) => {
          const next = typeof show === "function" ? show(state.show) : show;
          if (!next) closePostbackSecretModal();
        }}
        secret={state.secret}
      />
    );
  }

  return {
    openPostbackSecretModal,
    closePostbackSecretModal,
    PostbackSecretModal: PostbackSecretModalWrapper,
    isPostbackSecretModalOpen: state.show,
  };
}
