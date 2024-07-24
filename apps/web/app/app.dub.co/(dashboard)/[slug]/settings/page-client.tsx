"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import ConnectStripe from "@/ui/workspaces/connect-stripe";
import DeleteWorkspace from "@/ui/workspaces/delete-workspace";
import UploadLogo from "@/ui/workspaces/upload-logo";
import WorkspaceId from "@/ui/workspaces/workspace-id";
import { Form } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export default function WorkspaceSettingsClient() {
  const router = useRouter();
  const { id, name, slug, role, flags } = useWorkspace();

  const permissionsError = clientAccessCheck({
    action: "workspaces.write",
    role,
  }).error;

  const { update } = useSession();

  return (
    <>
      <Form
        title="Workspace Name"
        description={`This is the name of your workspace on ${process.env.NEXT_PUBLIC_APP_NAME}.`}
        inputAttrs={{
          name: "name",
          defaultValue: name,
          placeholder: "My Workspace",
          maxLength: 32,
        }}
        helpText="Max 32 characters."
        disabledTooltip={permissionsError || undefined}
        handleSubmit={(updateData) =>
          fetch(`/api/workspaces/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }).then(async (res) => {
            if (res.status === 200) {
              await Promise.all([
                mutate("/api/workspaces"),
                mutate(`/api/workspaces/${id}`),
              ]);
              toast.success("Successfully updated workspace name!");
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
          })
        }
      />
      <Form
        title="Workspace Slug"
        description={`This is your workspace's unique slug on ${process.env.NEXT_PUBLIC_APP_NAME}.`}
        inputAttrs={{
          name: "slug",
          defaultValue: slug,
          placeholder: "my-workspace",
          pattern: "^[a-z0-9-]+$",
          maxLength: 48,
        }}
        helpText="Only lowercase letters, numbers, and dashes. Max 48 characters."
        disabledTooltip={permissionsError || undefined}
        handleSubmit={(data) =>
          fetch(`/api/workspaces/${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              const { slug: newSlug } = await res.json();
              await mutate("/api/workspaces");
              if (newSlug != slug) {
                router.push(`/${newSlug}/settings`);
                update();
              }
              toast.success("Successfully updated workspace slug!");
            } else {
              const { error } = await res.json();
              toast.error(error.message);
            }
          })
        }
      />
      <WorkspaceId />
      <UploadLogo />
      {flags?.conversions && (
        <Suspense>
          <ConnectStripe />
        </Suspense>
      )}
      <DeleteWorkspace />
    </>
  );
}
