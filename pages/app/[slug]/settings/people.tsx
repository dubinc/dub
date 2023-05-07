import SettingsLayout from "@/components/app/settings/layout";
import { useInviteTeammateModal } from "components/app/modals/invite-teammate-modal";
import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import BlurImage from "#/ui/blur-image";
import { UserProps } from "@/lib/types";
import { fetcher, timeAgo } from "@/lib/utils";

const tabs = ["Members", "Invitations"];

export default function ProjectSettingsPeople() {
  const { setShowInviteTeammateModal, InviteTeammateModal } =
    useInviteTeammateModal();

  const router = useRouter();
  const { slug } = router.query as { slug?: string };
  const [currentTab, setCurrentTab] = useState("Members");

  const { data: users } = useSWR<UserProps[]>(
    slug &&
      (currentTab === "Members"
        ? `/api/projects/${slug}/users`
        : `/api/projects/${slug}/invite`),
    fetcher,
  );

  return (
    <SettingsLayout>
      <InviteTeammateModal />
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col items-center justify-between space-y-3 p-5 sm:flex-row sm:space-y-0 sm:p-10">
          <div className="flex flex-col space-y-3">
            <h2 className="text-xl font-medium">People</h2>
            <p className="text-sm text-gray-500">
              Teammates or friends that have access to this project.
            </p>
          </div>
          <button
            onClick={() => setShowInviteTeammateModal(true)}
            className="h-9 w-full rounded-md border border-black bg-black px-6 text-sm text-white transition-all duration-150 ease-in-out hover:bg-white hover:text-black focus:outline-none sm:w-auto"
          >
            Invite
          </button>
        </div>
        <div className="flex space-x-3 border-b border-gray-200 px-3 sm:px-7">
          {tabs.map((tab) => (
            <div
              key={tab}
              className={`${
                tab === currentTab ? "border-black" : "border-transparent"
              } border-b py-1`}
            >
              <button
                onClick={() => setCurrentTab(tab)}
                className="rounded-md px-3 py-1.5 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
              >
                {tab}
              </button>
            </div>
          ))}
        </div>
        <div className="grid divide-y divide-gray-200">
          {users ? (
            users.length > 0 ? (
              users.map(({ name, email, joinedAt }) => (
                <div
                  key={email}
                  className="flex items-center justify-between space-x-3 px-4 py-3 sm:px-8"
                >
                  <div className="flex items-center space-x-3">
                    <BlurImage
                      src={`https://avatars.dicebear.com/api/micah/${email}.svg`}
                      alt={email}
                      width={40}
                      height={40}
                      className="overflow-hidden rounded-full border border-gray-200"
                    />
                    <div className="flex flex-col">
                      <h3 className="text-sm font-medium">{name || email}</h3>
                      <p className="text-xs text-gray-500">{email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {currentTab === "Members" ? "Joined " : "Invited "}
                    {timeAgo(joinedAt)}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10">
                <BlurImage
                  src="/_static/illustrations/video-park.svg"
                  alt="No invitations sent"
                  width={300}
                  height={300}
                  className="pointer-events-none -my-8"
                />
                <p className="text-sm text-gray-500">No invitations sent</p>
              </div>
            )
          ) : (
            Array.from({ length: 5 }).map((_, i) => <UserPlaceholder key={i} />)
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}

const UserPlaceholder = () => (
  <div className="flex items-center justify-between space-x-3 px-4 py-3 sm:px-8">
    <div className="flex items-center space-x-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
      <div className="flex flex-col">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
    <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
  </div>
);
