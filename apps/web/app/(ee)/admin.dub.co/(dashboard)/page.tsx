import { constructMetadata } from "@dub/utils";
import BanLink from "./components/ban-link";
import DeletePartnerAccount from "./components/delete-partner-account";
import ImpersonateUser from "./components/impersonate-user";
import ImpersonateWorkspace from "./components/impersonate-workspace";
import RefreshDomain from "./components/refresh-domain";

export const metadata = constructMetadata({
  title: "Dub Admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-neutral-200 overflow-auto bg-white">
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate User</h2>
        <p className="text-sm text-neutral-500">Get a login link for a user</p>
        <ImpersonateUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate Workspace</h2>
        <p className="text-sm text-neutral-500">
          Get a login link for the owner of a workspace
        </p>
        <ImpersonateWorkspace />
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
        <h2 className="text-xl font-semibold">Refresh Domain</h2>
        <p className="text-sm text-neutral-500">
          Remove and re-add domain from Vercel
        </p>
        <RefreshDomain />
      </div>
    </div>
  );
}
