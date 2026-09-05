import { BanLink } from "./components/ban-link";
import { DeletePartnerAccount } from "./components/delete-partner-account";
import { DisableRestoreWorkspace } from "./components/disable-restore-workspace";
import { ImpersonateUser } from "./components/impersonate-user";
import { ResetLoginAttempts } from "./components/reset-login-attempts";
import { SlackSupportInvite } from "./components/slack-support-invite";

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-neutral-200 overflow-auto bg-white">
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate User</h2>
        <p className="text-sm text-neutral-500">
          Get a login link by user/partner email, workspace slug, or domain.
          Workspace and domain lookups impersonate the main owner.
        </p>
        <ImpersonateUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Ban Link</h2>
        <p className="text-sm text-neutral-500">Ban a dub.sh link</p>
        <BanLink />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Delete Stripe Express Account</h2>
        <p className="text-sm text-neutral-500">
          Delete a partner's Stripe express account (and potentially their
          partner account as well). <br />
          <br />
          Caveats:
          <br />- If the partner has already received payouts via Stripe, their
          Stripe Express account won't be deleted.
          <br />- If the partner has already received commissions or leads on
          Dub, their partner account won't be deleted.
        </p>
        <DeletePartnerAccount />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Reset Login Attempts</h2>
        <p className="text-sm text-neutral-500">
          Reset a user's invalidLoginAttempts and lockedAt fields
        </p>
        <ResetLoginAttempts />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Slack Support Invite</h2>
        <p className="text-sm text-neutral-500">
          Manually send a priority Slack Connect invite to a user for a given
          workspace (bypasses the plan check).
        </p>
        <SlackSupportInvite />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
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
