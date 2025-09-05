import { GroupAdditionalLinks } from "./group-additional-links";
import { GroupDefaultLinks } from "./group-default-links";
import { GroupLinkSettings } from "./group-link-settings";

export default function GroupDefaultLinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <GroupDefaultLinks />
      <GroupAdditionalLinks />
      <GroupLinkSettings />
    </div>
  );
}
