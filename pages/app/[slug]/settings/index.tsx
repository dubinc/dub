import SettingsLayout from "@/components/layout/app/settings-layout";
import Form from "#/ui/form";
import useProject from "#/lib/swr/use-project";
import DeleteProject from "@/components/app/projects/settings/delete-project";
import { toast } from "sonner";
import { mutate } from "swr";
import { useRouter } from "next/router";

export default function ProjectSettingsGeneral() {
  const router = useRouter();
  const { name, slug } = useProject();

  return (
    <SettingsLayout>
      <Form
        title="Project Name"
        description="This is the name of your project on Dub."
        inputData={{
          name: "name",
          defaultValue: name,
          placeholder: "My Project",
          maxLength: 32,
        }}
        helpText="Max 32 characters,"
        handleSubmit={(updateData) =>
          fetch(`/api/projects/${slug}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          }).then(async (res) => {
            if (res.status === 200) {
              mutate("/api/projects");
              mutate(`/api/projects/${slug}`);
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
        description="This is your project's URL slug on Dub."
        inputData={{
          name: "slug",
          defaultValue: slug,
          placeholder: "my-project",
          pattern: "^[a-z0-9-]+$",
          maxLength: 48,
        }}
        helpText="Only lowercase letters, numbers, and dashes. Max 48 characters."
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
              mutate("/api/projects");
              router.push(`/${newSlug}/settings`);
              toast.success("Successfully updated project slug!");
            } else if (res.status === 422) {
              toast.error("Project slug already exists");
            } else {
              toast.error("Something went wrong");
            }
          })
        }
      />
      <DeleteProject />
    </SettingsLayout>
  );
}
