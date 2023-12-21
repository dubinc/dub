"use client";

import useProject from "@/lib/swr/use-project";
import DeleteProject from "@/ui/projects/delete-project";
import UploadLogo from "@/ui/projects/upload-logo";
import { Form } from "@dub/ui";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mutate } from "swr";

export default function ProjectSettingsClient() {
  const router = useRouter();
  const { name, slug, plan, isOwner } = useProject();

  return (
    <>
      <Form
        title="Project Name"
        description={`This is the name of your project on ${process.env.NEXT_PUBLIC_APP_NAME}.`}
        inputData={{
          name: "name",
          defaultValue: name,
          placeholder: "My Project",
          maxLength: 32,
        }}
        helpText="Max 32 characters."
        {...(plan === "enterprise" &&
          !isOwner && {
            disabledTooltip: "Only project owners can change the project name.",
          })}
        handleSubmit={(updateData) =>
          fetch(`/api/projects/${slug}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }).then(async (res) => {
            if (res.status === 200) {
              await Promise.all([
                mutate("/api/projects"),
                mutate(`/api/projects/${slug}`),
              ]);
              toast.success("Successfully updated project name!");
            } else if (res.status === 422) {
              toast.error("Project slug already exists");
            } else {
              const errorMessage = await res.text();
              toast.error(errorMessage || "Something went wrong");
            }
          })
        }
      />
      <Form
        title="Project Slug"
        description={`This is your project's unique slug on ${process.env.NEXT_PUBLIC_APP_NAME}.`}
        inputData={{
          name: "slug",
          defaultValue: slug,
          placeholder: "my-project",
          pattern: "^[a-z0-9-]+$",
          maxLength: 48,
        }}
        helpText="Only lowercase letters, numbers, and dashes. Max 48 characters."
        {...(plan === "enterprise" &&
          !isOwner && {
            disabledTooltip: "Only project owners can change the project slug.",
          })}
        handleSubmit={(data) =>
          fetch(`/api/projects/${slug}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          }).then(async (res) => {
            if (res.status === 200) {
              const { slug: newSlug } = await res.json();
              await mutate("/api/projects");
              router.push(`/${newSlug}/settings`);
              toast.success("Successfully updated project slug!");
            } else {
              const error = await res.text();
              toast.error(error || "Something went wrong");
            }
          })
        }
      />
      <UploadLogo />
      <DeleteProject />
    </>
  );
}
