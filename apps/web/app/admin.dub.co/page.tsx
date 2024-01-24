import { constructMetadata } from "@dub/utils";
import BanUser from "./components/ban";
import ImpersonateProject from "./components/impersonate-project";
import ImpersonateUser from "./components/impersonate-user";
import DeleteLink from "./components/delete-link";

export const metadata = constructMetadata({
  title: "Dub Admin",
  noIndex: true,
});

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col divide-y divide-gray-200 overflow-auto bg-white">
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate User</h2>
        <p className="text-sm text-gray-500">Get a login link for a user.</p>
        <ImpersonateUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Impersonate Project</h2>
        <p className="text-sm text-gray-500">
          Get a login link for the owner of a project.
        </p>
        <ImpersonateProject />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Ban Users</h2>
        <p className="text-sm text-gray-500">
          Ban users from Dub. This will prevent them from logging in.
        </p>
        <BanUser />
      </div>
      <div className="flex flex-col space-y-4 px-5 py-10">
        <h2 className="text-xl font-semibold">Delete Anonymous Links</h2>
        <p className="text-sm text-gray-500">
          Delete anonymous dub.sh links and blacklists the domain.
        </p>
        <DeleteLink />
      </div>
    </div>
  );
}
