import { RefreshDomain } from "./components/refresh-domain";
import { RegisterPremiumDomain } from "./components/register-premium-domain";
import { RenewDomain } from "./components/renew-domain";

export default function AdminDomainsPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-neutral-200 overflow-auto bg-white">
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Register premium .link domain</h2>
        <p className="text-sm text-neutral-500">
          Create a domain-renewal invoice and charge the workspace default
          payment method for a premium .link domain. On success, the domain is
          provisioned in Dub, but you'll need to register it manually via
          Dynadot (limitation of their API).
        </p>
        <RegisterPremiumDomain />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Renew domain (.link)</h2>
        <p className="text-sm text-neutral-500">
          Create a new domain-renewal invoice and charge the workspace default
          payment method. On success, Stripe webhooks extend Dub expiry and
          re-enable Dynadot auto-renew. If the domain has already expired at
          Dynadot, you may still need to renew it in the Dynadot dashboard.
        </p>
        <RenewDomain />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Refresh domain</h2>
        <p className="text-sm text-neutral-500">
          Remove and re-add domain from Vercel
        </p>
        <RefreshDomain />
      </div>
    </div>
  );
}
