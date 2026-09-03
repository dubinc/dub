"use client";

import { X } from "@/ui/shared/icons";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { cn, validDomainRegex } from "@dub/utils";
import { useState } from "react";
import { toast } from "sonner";

const isValidHostname = (hostname: string) => {
  return (
    validDomainRegex.test(hostname) ||
    hostname === "localhost" ||
    hostname.startsWith("*.")
  );
};

const AddHostnameModal = ({
  showModal,
  setShowModal,
  existingHostnames,
  onAdd,
}: {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  existingHostnames: string[];
  onAdd: (hostname: string) => void | Promise<void>;
}) => {
  const [hostname, setHostname] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isMobile } = useMediaQuery();

  const close = () => {
    if (isLoading) {
      return;
    }

    setShowModal(false);
  };

  const handleAdd = async () => {
    if (isLoading) {
      return;
    }

    if (existingHostnames.includes(hostname)) {
      toast.error("Hostname already exists.");
      return;
    }

    if (!isValidHostname(hostname)) {
      toast.error("Enter a valid domain.");
      return;
    }

    setIsLoading(true);
    try {
      await onAdd(hostname);
      setHostname("");
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  };

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

      <form
        className="bg-neutral-50"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleAdd();
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
            type="button"
            onClick={close}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="primary"
            text="Add hostname"
            className="h-8 w-fit px-3"
            disabled={!isValidHostname(hostname)}
            loading={isLoading}
          />
        </div>
      </form>
    </Modal>
  );
};

export function useAddHostnameModal({
  existingHostnames,
  onAdd,
}: {
  existingHostnames: string[];
  onAdd: (hostname: string) => void | Promise<void>;
}) {
  const [showAddHostnameModal, setShowAddHostnameModal] = useState(false);

  return {
    setShowAddHostnameModal,
    addHostnameModal: (
      <AddHostnameModal
        showModal={showAddHostnameModal}
        setShowModal={setShowAddHostnameModal}
        existingHostnames={existingHostnames}
        onAdd={onAdd}
      />
    ),
  };
}
