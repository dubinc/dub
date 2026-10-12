"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import DeleteAccountSection from "@/ui/account/delete-account";
import UpdateDefaultWorkspace from "@/ui/account/update-default-workspace";
import UpdateSubscription from "@/ui/account/update-subscription";
import UploadAvatar from "@/ui/account/upload-avatar";
import UserId from "@/ui/account/user-id";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import {
  IdentitySyncField,
  IdentitySyncSnapshot,
  useIdentitySyncConfirmModal,
} from "@/ui/modals/identity-sync-confirm-modal";
import { Form, useCurrentSubdomain } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type PendingUserPatch = {
  body: Record<string, unknown>;
  onSuccess: () => void;
};

function getAccountSyncCandidates({
  field,
  value,
  user,
  partner,
}: {
  field: "name" | "email" | "image";
  value: string | null;
  user?: { name?: string | null; email?: string | null; image?: string | null };
  partner?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}): IdentitySyncField[] {
  if (field === "name") {
    if (value === user?.name || value === partner?.name) {
      return [];
    }

    return ["name"];
  }

  if (field === "email") {
    if (value === user?.email || value === partner?.email) {
      return [];
    }

    return ["email"];
  }

  if (value === user?.image || value === partner?.image) {
    return [];
  }

  return ["image"];
}

export function SettingsPageClient() {
  const { data: session, update, status } = useSession();
  const { subdomain } = useCurrentSubdomain();
  const isPartnerDomain = subdomain === "partners";
  const { partner } = usePartnerProfile();
  const pendingPatchRef = useRef<PendingUserPatch | null>(null);
  const [syncModalContent, setSyncModalContent] = useState<{
    changedFields: IdentitySyncField[];
    current: IdentitySyncSnapshot;
    next: IdentitySyncSnapshot;
  }>({
    changedFields: [],
    current: {},
    next: {},
  });

  const patchUser = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status !== 200) {
      const { error } = await res.json();
      throw new Error(error.message);
    }

    const isPendingEmailChange =
      typeof body.email === "string" && body.email !== session?.user?.email;

    // Email isn't updated until the user confirms via link — skip session refresh
    if (!isPendingEmailChange) {
      await update();
    }

    if (body.syncIdentity) {
      mutatePrefix("/api/partner-profile");
    }
  };

  const finishPendingPatch = async (syncIdentity: boolean) => {
    const pending = pendingPatchRef.current;

    if (!pending) {
      return;
    }

    try {
      await patchUser({
        ...pending.body,
        syncIdentity,
      });
      pending.onSuccess();
      pendingPatchRef.current = null;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      throw error;
    }
  };

  const { setShowModal: setShowConfirmModal, confirmModal } =
    useIdentitySyncConfirmModal({
      title: "Also update your partner account?",
      intro:
        "You're updating your user account. These fields differ from your partner account:",
      changedFields: syncModalContent.changedFields,
      current: syncModalContent.current,
      next: syncModalContent.next,
      onConfirm: async () => {
        await finishPendingPatch(true);
      },
      onCancel: async () => {
        await finishPendingPatch(false);
      },
      onDismiss: () => {
        pendingPatchRef.current = null;
      },
    });

  const requestSubmit = ({
    body,
    field,
    value,
    onSuccess,
  }: {
    body: Record<string, unknown>;
    field: "name" | "email" | "image";
    value: string | null;
    onSuccess: () => void;
  }): Promise<void> => {
    if (!isPartnerDomain) {
      return patchUser({ ...body, syncIdentity: false })
        .then(onSuccess)
        .catch((error) => {
          toast.error(error.message);
        })
        .then(() => undefined);
    }

    const syncCandidates = getAccountSyncCandidates({
      field,
      value,
      user: session?.user,
      partner,
    });

    if (syncCandidates.length === 0) {
      return patchUser({ ...body, syncIdentity: false })
        .then(onSuccess)
        .catch((error) => {
          toast.error(error.message);
        })
        .then(() => undefined);
    }

    pendingPatchRef.current = { body, onSuccess };
    setSyncModalContent({
      changedFields: syncCandidates,
      current: {
        name: partner?.name,
        email: partner?.email,
        image: partner?.image,
        id: partner?.id,
      },
      next: {
        name: field === "name" ? value : session?.user?.name,
        email: field === "email" ? value : session?.user?.email,
        image: field === "image" ? value : session?.user?.image,
      },
    });
    setShowConfirmModal(true);

    return Promise.resolve();
  };

  return (
    <>
      {isPartnerDomain && confirmModal}
      <PageWidthWrapper className="mb-8 grid gap-8">
        <Form
          title="Your Name"
          description="This is your display name on Dub."
          inputAttrs={{
            name: "name",
            defaultValue:
              status === "loading" ? undefined : session?.user?.name || "",
            placeholder: "Steve Jobs",
            maxLength: 32,
          }}
          helpText="Max 32 characters."
          handleSubmit={(data) =>
            requestSubmit({
              body: data,
              field: "name",
              value: data.name,
              onSuccess: () => {
                toast.success("Successfully updated your name!");
              },
            })
          }
        />
        <Form
          title="Your Email"
          description="This will be the email you use to log in to Dub and receive notifications. A confirmation is required for changes."
          inputAttrs={{
            name: "email",
            type: "email",
            defaultValue: session?.user?.email || undefined,
            placeholder: "panic@thedis.co",
          }}
          helpText={<UpdateSubscription />}
          handleSubmit={(data) =>
            requestSubmit({
              body: data,
              field: "email",
              value: data.email,
              onSuccess: () => {
                toast.success(
                  `A confirmation email has been sent to ${data.email}.`,
                );
              },
            })
          }
        />
        <UploadAvatar
          onSubmit={
            isPartnerDomain
              ? (image) =>
                  requestSubmit({
                    body: { image },
                    field: "image",
                    value: image,
                    onSuccess: () => {
                      toast.success(
                        "Successfully updated your profile picture!",
                      );
                    },
                  })
              : undefined
          }
        />
        <UserId />
        {subdomain === "app" && <UpdateDefaultWorkspace />}
        <DeleteAccountSection />
      </PageWidthWrapper>
    </>
  );
}
