"use client";

import { X } from "@/ui/shared/icons";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { cn, validDomainRegex } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const isValidHostname = (hostname: string) => {
  return (
    validDomainRegex.test(hostname) ||
    hostname === "localhost" ||
    hostname.startsWith("*.")
  );
};

const AddHostnameForm = ({
  existingHostnames,
  onAdd,
  onCancel,
}: {
  existingHostnames: string[];
  onAdd: (hostname: string) => void;
  onCancel?: () => void;
}) => {
  const [hostname, setHostname] = useState("");
  const { isMobile } = useMediaQuery();

  return (
    <form
      className="bg-neutral-50"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (existingHostnames.includes(hostname)) {
          toast.error("Hostname already exists.");
          return;
        }

        if (!isValidHostname(hostname)) {
          toast.error("Enter a valid domain.");
          return;
        }

        onAdd(hostname);
        setHostname("");
      }}
    >
      <div className="relative flex-1 rounded-md px-6 py-5">
        <input
          type="text"
          required
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          autoComplete="off"
          autoFocus={!isMobile}
          placeholder="example.com or *.example.com"
          className={cn(
            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          )}
        />
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-6 py-5">
        <Button
          onClick={() => onCancel?.()}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          type="submit"
          variant="primary"
          text="Add hostname"
          className="h-8 w-fit px-3"
          disabled={!isValidHostname(hostname)}
        />
      </div>
    </form>
  );
};

interface AddHostnameModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  existingHostnames: string[];
  onAdd: (hostname: string) => void;
}

const AddHostnameModal = ({
  showModal,
  setShowModal,
  existingHostnames,
  onAdd,
}: AddHostnameModalProps) => {
  const close = () => setShowModal(false);
  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex items-center justify-between border-b border-neutral-200 p-4">
        <h3 className="text-lg font-medium">Add hostname</h3>
        <button
          type="button"
          onClick={close}
          className="group rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-neutral-50">
        <AddHostnameForm
          existingHostnames={existingHostnames}
          onCancel={close}
          onAdd={(hostname) => {
            onAdd(hostname);
            close();
          }}
        />
      </div>
    </Modal>
  );
};

export function useAddHostnameModal({
  existingHostnames,
  onAdd,
}: {
  existingHostnames: string[];
  onAdd: (hostname: string) => void;
}) {
  const [showAddHostnameModal, setShowAddHostnameModal] = useState(false);

  const AddHostnameModalCallback = useCallback(() => {
    return (
      <AddHostnameModal
        showModal={showAddHostnameModal}
        setShowModal={setShowAddHostnameModal}
        existingHostnames={existingHostnames}
        onAdd={onAdd}
      />
    );
  }, [showAddHostnameModal, existingHostnames, onAdd]);

  return useMemo(
    () => ({
      setShowAddHostnameModal,
      AddHostnameModal: AddHostnameModalCallback,
    }),
    [AddHostnameModalCallback],
  );
}
