"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { Button, LoadingDots, Modal } from "@dub/ui";
import { cn, validDomainRegex } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

const AddHostnameForm = ({
  onCreate,
  onCancel,
}: {
  onCreate: () => void;
  onCancel?: () => void;
}) => {
  const [hostname, setHostname] = useState("");
  const [processing, setProcessing] = useState(false);
  const { id, allowedHostnames, mutate, role } = useWorkspace();

  const { error: permissionsError } = clientAccessCheck({
    action: "workspaces.write",
    role,
    customPermissionDescription: "add hostnames",
  });

  const isValidHostname = (hostname: string) => {
    return (
      validDomainRegex.test(hostname) ||
      hostname === "localhost" ||
      hostname.startsWith("*.")
    );
  };

  const addHostname = async () => {
    if (allowedHostnames?.includes(hostname)) {
      toast.error("Hostname already exists.");
      return;
    }

    if (!isValidHostname(hostname)) {
      toast.error("Enter a valid domain.");
      return;
    }

    setProcessing(true);

    const response = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        allowedHostnames: [...(allowedHostnames || []), hostname],
      }),
    });

    if (response.ok) {
      toast.success("Hostname added.");
      onCreate();
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    mutate();
    setProcessing(false);
    setHostname("");
  };

  return (
    <form
      className="bg-neutral-50"
      onSubmit={(e) => {
        e.preventDefault();
        addHostname();
      }}
    >
      <div className="relative flex-1 rounded-md px-6 py-5">
        <input
          type="text"
          required
          value={hostname}
          onChange={(e) => setHostname(e.target.value)}
          autoComplete="off"
          placeholder="example.com or *.example.com"
          className={cn(
            "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
          )}
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-neutral-200 px-6 py-5">
        <div>{processing && <LoadingDots />}</div>
        <div className="items-centerend flex gap-2">
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
            loading={processing}
            disabledTooltip={permissionsError || undefined}
          />
        </div>
      </div>
    </form>
  );
};

interface AddHostnameModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const AddHostnameModal = ({
  showModal,
  setShowModal,
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
        <AddHostnameForm onCancel={close} onCreate={close} />
      </div>
    </Modal>
  );
};

export function useAddHostnameModal() {
  const [showAddHostnameModal, setShowAddHostnameModal] = useState(false);

  const AddHostnameModalCallback = useCallback(() => {
    return (
      <AddHostnameModal
        showModal={showAddHostnameModal}
        setShowModal={setShowAddHostnameModal}
      />
    );
  }, [showAddHostnameModal, setShowAddHostnameModal]);

  return useMemo(
    () => ({
      setShowAddHostnameModal,
      AddHostnameModal: AddHostnameModalCallback,
    }),
    [setShowAddHostnameModal, AddHostnameModalCallback],
  );
}
