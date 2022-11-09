import CustomDomain from "@/components/app/settings/custom-domain";
import DeleteProject from "@/components/app/settings/delete-project";
import LandingPage from "@/components/app/settings/landing-page";
import SettingsLayout from "@/components/app/settings/layout";

export default function ProjectSettingsGeneral() {
  return (
    <SettingsLayout>
      <CustomDomain />
      <LandingPage />
      <DeleteProject />
    </SettingsLayout>
  );
}
