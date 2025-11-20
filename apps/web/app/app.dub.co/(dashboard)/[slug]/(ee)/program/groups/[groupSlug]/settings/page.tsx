import { GroupApplicationSettings } from "./group-application-settings";
import { GroupSettings } from "./group-settings";

export default function GroupSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <GroupSettings />
      <GroupApplicationSettings />
    </div>
  );
}
