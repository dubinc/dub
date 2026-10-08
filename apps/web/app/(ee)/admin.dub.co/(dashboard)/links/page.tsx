import { BanLink } from "./components/ban-link";
import { DisableRestoreWorkspace } from "./components/disable-restore-workspace";

export default function AdminLinksPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-neutral-200">
      <div className="flex flex-col space-y-4 px-1 py-6">
        <h2 className="text-xl font-semibold">Ban Link</h2>
        <p className="text-sm text-neutral-500">Ban a dub.sh link</p>
        <BanLink />
      </div>
      <div className="flex flex-col space-y-4 px-1 py-6">
        <h2 className="text-xl font-semibold">Disable / Restore Workspace</h2>
        <p className="text-sm text-neutral-500">
          Disable or restore all links for a workspace. Disabling also
          downgrades owners to billing, members to viewer, and emails workspace
          owners. Restoring reverts those role changes.
        </p>
        <DisableRestoreWorkspace />
      </div>
    </div>
  );
}
