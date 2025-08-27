import { GroupAdditionalLinks } from "./group-additional-links";
import { GroupDefaultLinks } from "./group-default-links";
import { GroupUTM } from "./group-utm";

export default function GroupDefaultLinksPage() {
  return (
    <div className="flex flex-col gap-6">
      <GroupDefaultLinks />
      <GroupAdditionalLinks />
      <GroupUTM />
    </div>
  );
}
