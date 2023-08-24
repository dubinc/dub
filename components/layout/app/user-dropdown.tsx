import { useContext, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Logout } from "@/components/shared/icons";
import Popover from "#/ui/popover";
import IconMenu from "../../shared/icon-menu";
import va from "@vercel/analytics";
import Link from "next/link";
import { Edit3, HelpCircle, MessageCircle, Settings } from "lucide-react";
import { Crisp } from "crisp-sdk-web";
import { LoadingCircle } from "#/ui/icons";
import Badge from "#/ui/badge";
import Cookies from "js-cookie";
import { ModalContext } from "#/ui/modal-provider";
import { allChangelogPosts } from "contentlayer/generated";
import { HOME_DOMAIN } from "#/lib/constants";
import Avatar from "#/ui/avatar";

export default function UserDropdown() {
  const { data: session } = useSession();
  const [openPopover, setOpenPopover] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);

  useEffect(() => {
    Crisp.chat.onChatOpened(() => {
      va.track("Open support chat");
      setOpeningSupport(false);
      setOpenPopover(false);
    });
    Crisp.chat.onChatClosed(() => {
      Crisp.chat.hide();
    });
  }, []);

  const [unreadChangelogs, setUnreadChangelogs] = useState(0);
  useEffect(() => {
    const lastReadChangelog =
      Cookies.get("lastReadChangelog") || new Date("2023-08-13").toISOString();
    const unreadChangelogs = allChangelogPosts.filter(
      (post) => post.publishedAt > lastReadChangelog,
    ).length;
    setUnreadChangelogs(unreadChangelogs);
  }, []);

  const { setShowCMDK } = useContext(ModalContext);

  return (
    <div className="relative inline-block">
      <Popover
        content={
          <div className="flex w-full flex-col space-y-px rounded-md bg-white p-3 sm:w-56">
            <div className="p-2">
              {session?.user?.name && (
                <p className="truncate text-sm font-medium text-gray-900">
                  {session?.user?.name}
                </p>
              )}
              <p className="truncate text-sm text-gray-500">
                {session?.user?.email}
              </p>
            </div>
            <button
              className="w-full rounded-md p-2 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
              onClick={() => {
                setShowCMDK(true);
                setOpenPopover(false);
              }}
            >
              <IconMenu
                text="Help Center"
                icon={<HelpCircle className="h-4 w-4" />}
              />
            </button>
            <button
              className="w-full rounded-md p-2 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
              onClick={() => {
                setOpeningSupport(true);
                Crisp.chat.open();
                Crisp.chat.show();
              }}
            >
              <IconMenu
                text="Support"
                icon={
                  openingSupport ? (
                    <LoadingCircle />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )
                }
              />
            </button>
            <Link
              href="/settings"
              className="block w-full rounded-md p-2 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <IconMenu
                text="Settings"
                icon={<Settings className="h-4 w-4" />}
              />
            </Link>
            <Link
              href={`${HOME_DOMAIN}/changelog`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                Cookies.set("lastReadChangelog", new Date().toISOString())
              }
              className="flex w-full justify-between rounded-md p-2 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <IconMenu text="Changelog" icon={<Edit3 className="h-4 w-4" />} />
              {unreadChangelogs > 0 && (
                <Badge text={`${unreadChangelogs}`} variant="blue" />
              )}
            </Link>
            <button
              className="w-full rounded-md p-2 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
              onClick={() => {
                signOut({
                  callbackUrl: "/login",
                });
                // track logout event
                va.track("Logout");
              }}
            >
              <IconMenu text="Logout" icon={<Logout className="h-4 w-4" />} />
            </button>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="group relative"
        >
          {session?.user ? (
            <Avatar
              user={session.user}
              className="h-9 w-9 transition-all duration-75 group-focus:outline-none group-active:scale-95 sm:h-10 sm:w-10"
            />
          ) : (
            <div className="h-9 w-9 animate-pulse rounded-full border border-gray-300 bg-gray-100 sm:h-10 sm:w-10" />
          )}
          {unreadChangelogs > 0 && (
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-blue-500" />
          )}
        </button>
      </Popover>
    </div>
  );
}
