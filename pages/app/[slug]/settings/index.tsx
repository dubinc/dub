import DeleteProject from "@/components/app/settings/delete-project";
import ProjectName from "@/components/app/settings/project-name";
import SettingsLayout from "@/components/app/settings/layout";
import ProjectSlug from "@/components/app/settings/project-slug";

export default function ProjectSettingsGeneral() {
  return (
    <SettingsLayout>
      <ProjectName />
      <ProjectSlug />
      <DeleteProject />
    </SettingsLayout>
  );
}
