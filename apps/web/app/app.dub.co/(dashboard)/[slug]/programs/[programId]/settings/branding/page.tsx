import { BrandingSettings } from "./branding-settings";
import { EmbedSection } from "./embed-section";

export default function ProgramSettingsBrandingPage() {
  return (
    <div className="flex flex-col gap-10">
      <BrandingSettings />
      <EmbedSection />
    </div>
  );
}
