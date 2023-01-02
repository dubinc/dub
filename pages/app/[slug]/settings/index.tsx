import DeleteProject from "@/components/app/settings/delete-project";
import LandingPage from "@/components/app/settings/landing-page";
import SettingsLayout from "@/components/app/settings/layout";

export default function ProjectSettingsGeneral() {
  return (
    <SettingsLayout>
      <LandingPage />
      <DeleteProject />
    </SettingsLayout>
  );
}
