"use client";

import DeleteAccountSection from "@/ui/account/delete-account";
import UpdateDefaultWorkspace from "@/ui/account/update-default-workspace";
import UpdateSubscription from "@/ui/account/update-subscription";
import UploadAvatar from "@/ui/account/upload-avatar";
import UserId from "@/ui/account/user-id";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Form, useCurrentSubdomain } from "@dub/ui";
import { APP_NAME } from "@dub/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export function SettingsPageClient() {
  const { data: session, update, status } = useSession();
  const { subdomain } = useCurrentSubdomain();

  return (
    <PageWidthWrapper className="mb-8 grid gap-8">
      <Form
        title="Your Name"
        description={`This is your display name on ${APP_NAME}.`}
        inputAttrs={{
          name: "name",
          defaultValue:
            status === "loading" ? undefined : session?.user?.name || "",
          placeholder: "Steve Jobs",
          maxLength: 32,
        }}
        helpText="Max 32 characters."
        handleSubmit={(data) =>
          fetch("/api/user", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              update();
              toast.success("Successfully updated your name!");
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
          })
        }
      />
      <Form
        title="Your Email"
        description={`This will be the email you use to log in to ${APP_NAME} and receive notifications. A confirmation is required for changes.`}
        inputAttrs={{
          name: "email",
          type: "email",
          defaultValue: session?.user?.email || undefined,
          placeholder: "panic@thedis.co",
        }}
        helpText={<UpdateSubscription />}
        handleSubmit={(data) =>
          fetch("/api/user", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              toast.success(
                `A confirmation email has been sent to ${data.email}.`,
              );
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
          })
        }
      />
      <UploadAvatar />
      <UserId />
      {subdomain === "app" && <UpdateDefaultWorkspace />}
      <DeleteAccountSection />
    </PageWidthWrapper>
  );
}
