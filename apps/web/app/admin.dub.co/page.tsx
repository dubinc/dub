import { constructMetadata } from "@dub/utils";
import ImpersonateUser from "./components/impersonate-user";
import ImpersonateWorkspace from "./components/impersonate-workspace";
import RefreshDomain from "./components/refresh-domain";

export const metadata = constructMetadata({
  title: "Dub Admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-gray-200 overflow-auto bg-white">
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate User</h2>
        <p className="text-sm text-gray-500">Get a login link for a user</p>
        <ImpersonateUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate Workspace</h2>
        <p className="text-sm text-gray-500">
          Get a login link for the owner of a workspace
        </p>
        <ImpersonateWorkspace />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Refresh Domain</h2>
        <p className="text-sm text-gray-500">
          Remove and re-add domain from Vercel
        </p>
        <RefreshDomain />
      </div>
    </div>
  );
}
