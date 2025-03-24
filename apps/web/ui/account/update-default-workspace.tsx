"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import { Button, InputSelect, InputSelectItemProps } from "@dub/ui";
import { DICEBEAR_AVATAR_URL } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function UpdateDefaultWorkspace() {
  const { data: session, update } = useSession();
  const { workspaces } = useWorkspaces();

  const selectOptions = useMemo(() => {
    return workspaces
      ? workspaces.map((workspace) => ({
          id: workspace.slug,
          value: workspace.name,
          image: workspace.logo || `${DICEBEAR_AVATAR_URL}${workspace.name}`,
          disabled: workspace.slug === session?.user?.["defaultWorkspace"],
          label:
            workspace.slug === session?.user?.["defaultWorkspace"]
              ? "Current"
              : "",
        }))
      : [];
  }, [workspaces, session]);

  const [selectedWorkspace, setSelectedWorkspace] =
    useState<InputSelectItemProps | null>(null);

  useEffect(() => {
    setSelectedWorkspace(
      selectOptions.find(
        (option) => option.id === session?.user?.["defaultWorkspace"],
      ) || null,
    );
  }, [selectOptions, session]);

  const [saving, setSaving] = useState(false);

  async function updateDefaultWorkspace() {
    setSaving(true);
    const response = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultWorkspace: selectedWorkspace?.id || undefined,
      }),
    });

    if (response.ok) {
      setSaving(false);
      update();
    } else {
      setSaving(false);
      const { error } = await response.json();
      throw new Error(error.message);
    }
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        toast.promise(updateDefaultWorkspace(), {
          loading: "Saving changes...",
          success: "Successfully updated your default workspace!",
          error: (error) => error,
        });
      }}
      className="rounded-lg border border-neutral-200 bg-white"
    >
      <div className="flex flex-col space-y-3 p-5 sm:p-10">
        <h2 className="text-xl font-medium">Your Default Workspace</h2>
        <p className="text-sm text-neutral-500">
          Choose the workspace to show by default when you sign in.
        </p>
        <div className="mt-1 max-w-md">
          <InputSelect
            items={selectOptions}
            selectedItem={selectedWorkspace}
            setSelectedItem={setSelectedWorkspace}
            adjustForMobile
          />
        </div>
      </div>

      <div className="flex items-center justify-between space-x-4 rounded-b-lg border-t border-neutral-200 bg-neutral-50 p-3 sm:px-10">
        <a
          href="https://dub.co/help/article/how-to-change-default-workspace"
          target="_blank"
          className="text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-700"
        >
          Learn more about how default workspaces work
        </a>
        <div>
          <Button
            text="Save changes"
            loading={saving}
            disabled={
              !selectedWorkspace ||
              selectedWorkspace.id === session?.user?.["defaultWorkspace"]
            }
          />
        </div>
      </div>
    </form>
  );
}
