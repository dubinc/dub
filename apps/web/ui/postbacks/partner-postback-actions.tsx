"use client";

import { partnerProfileFetch } from "@/lib/api/partner-profile/client";
import { mutatePrefix } from "@/lib/swr/mutate";
import { PostbackProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { usePostbackSecretModal } from "@/ui/postbacks/postback-secret-modal";
import { SendTestPostbackModal } from "@/ui/postbacks/send-test-postback-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Popover } from "@dub/ui";
import {
  CircleCheck,
  CircleX,
  Pencil,
  RefreshCw,
  Send,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface PostbackActionsProps {
  postback: PostbackProps;
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
  onEditPostback: (postback: PostbackProps) => void;
  onMutate?: () => void;
}

export function PostbackActions({
  postback,
  openPopover,
  setOpenPopover,
  onEditPostback,
  onMutate,
}: PostbackActionsProps) {
  const router = useRouter();
  const [showSendTest, setShowSendTest] = useState(false);

  const { openPostbackSecretModal, PostbackSecretModal } =
    usePostbackSecretModal();

  const isDisabled = !!postback.disabledAt;

  const {
    confirmModal: disableConfirmModal,
    setShowConfirmModal: setShowDisableConfirmModal,
  } = useConfirmModal({
    title: "Disable postback",
    description:
      "Events will no longer be sent to this URL. You can re-enable it at any time.",
    confirmText: "Disable",
    onConfirm: async () => {
      await partnerProfileFetch(
        "@patch/api/partner-profile/postbacks/:postbackId",
        {
          params: {
            postbackId: postback.id,
          },
          body: {
            disabled: true,
          },
          onSuccess: () => {
            toast.success("Postback disabled");
            onMutate?.();
          },
          onError: () => {
            throw new Error("Failed to disable");
          },
        },
      );
    },
  });

  const {
    confirmModal: enableConfirmModal,
    setShowConfirmModal: setShowEnableConfirmModal,
  } = useConfirmModal({
    title: "Enable postback",
    description: "Events will be sent to this URL again.",
    confirmText: "Enable",
    onConfirm: async () => {
      await partnerProfileFetch(
        "@patch/api/partner-profile/postbacks/:postbackId",
        {
          params: {
            postbackId: postback.id,
          },
          body: {
            disabled: false,
          },
          onSuccess: () => {
            toast.success("Postback enabled");
            onMutate?.();
          },
          onError: () => {
            throw new Error("Failed to enable");
          },
        },
      );
    },
  });

  const {
    confirmModal: deleteConfirmModal,
    setShowConfirmModal: setShowDeleteConfirmModal,
  } = useConfirmModal({
    title: "Delete postback",
    description:
      "This action cannot be undone. This postback will be permanently deleted.",
    confirmText: "Delete",
    confirmVariant: "danger",
    onConfirm: async () => {
      await partnerProfileFetch(
        "@delete/api/partner-profile/postbacks/:postbackId",
        {
          params: {
            postbackId: postback.id,
          },
          onSuccess: () => {
            toast.success("Postback deleted");
            mutatePrefix("/api/partner-profile/postbacks");
            router.push("/profile/postbacks");
          },
          onError: () => {
            throw new Error("Failed to delete");
          },
        },
      );
    },
  });

  const {
    confirmModal: rollSecretConfirmModal,
    setShowConfirmModal: setShowRollSecretConfirmModal,
  } = useConfirmModal({
    title: "Roll signing secret",
    description:
      "The current signing secret will be invalidated. Update your application with the new secret.",
    confirmText: "Roll secret",
    onConfirm: async () => {
      const { data } = await partnerProfileFetch(
        "@post/api/partner-profile/postbacks/:postbackId/rotate-secret",
        {
          params: {
            postbackId: postback.id,
          },
          onSuccess: () => {
            toast.success("Signing secret rolled");
            onMutate?.();
          },
          onError: () => {
            throw new Error("Failed to roll secret");
          },
        },
      );
      if (data?.secret) {
        openPostbackSecretModal(data.secret);
      }
    },
  });

  const closeAnd = (fn: () => void) => {
    setOpenPopover(false);
    fn();
  };

  const handleEnableDisable = () => {
    if (isDisabled) {
      setShowEnableConfirmModal(true);
    } else {
      setShowDisableConfirmModal(true);
    }
  };

  return (
    <>
      {disableConfirmModal}
      {enableConfirmModal}
      {deleteConfirmModal}
      {rollSecretConfirmModal}
      {PostbackSecretModal}
      <SendTestPostbackModal
        postbackId={postback.id}
        triggers={postback.triggers}
        showModal={showSendTest}
        setShowModal={setShowSendTest}
        onSuccess={onMutate}
      />
      <Popover
        content={
          <div className="w-screen sm:w-48">
            <div className="grid gap-px p-2">
              <Button
                text="Send test event"
                variant="outline"
                icon={<Send className="size-4" />}
                className="h-9 justify-start px-2"
                onClick={() => closeAnd(() => setShowSendTest(true))}
              />
              <Button
                text="Roll signing secret"
                variant="outline"
                icon={<RefreshCw className="size-4" />}
                className="h-9 justify-start px-2"
                onClick={() =>
                  closeAnd(() => setShowRollSecretConfirmModal(true))
                }
              />
            </div>

            <div className="h-px w-full bg-neutral-200" />

            <div className="grid gap-px p-2">
              <Button
                text="Edit postback"
                variant="outline"
                icon={<Pencil className="size-4" />}
                className="h-9 justify-start px-2"
                onClick={() => closeAnd(() => onEditPostback(postback))}
              />

              <Button
                text={isDisabled ? "Enable postback" : "Disable postback"}
                variant="outline"
                icon={
                  isDisabled ? (
                    <CircleCheck className="size-4" />
                  ) : (
                    <CircleX className="size-4" />
                  )
                }
                className="h-9 justify-start px-2"
                onClick={() => closeAnd(handleEnableDisable)}
              />

              <Button
                text="Delete postback"
                variant="danger-outline"
                icon={<Trash className="size-4" />}
                className="h-9 justify-start px-2"
                onClick={() => closeAnd(() => setShowDeleteConfirmModal(true))}
              />
            </div>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <Button
          variant="outline"
          className="flex w-8 rounded-md border border-neutral-200 px-2 transition-[border-color] duration-200"
          icon={<ThreeDots className="h-5 w-5 shrink-0 text-neutral-500" />}
          onClick={() => setOpenPopover(!openPopover)}
        />
      </Popover>
    </>
  );
}
