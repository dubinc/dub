import { Suspense, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Logout } from "@/components/shared/icons";
import Popover from "@/components/shared/popover";
import IconMenu from "../../shared/icon-menu";
import Image from "next/image";
import va from "@vercel/analytics";
import Link from "next/link";
import { Edit3, MessageCircle, Settings } from "lucide-react";
import { Crisp } from "crisp-sdk-web";
import { LoadingCircle } from "#/ui/icons";
import Badge from "#/ui/badge";
import Cookies from "js-cookie";

export default function UserDropdown() {
  const { data: session } = useSession();
  const [openPopover, setOpenPopover] = useState(false);
  const [openingSupport, setOpeningSupport] = useState(false);

  useEffect(() => {
    Crisp.chat.onChatOpened(() => {
      va.track("Open support chat");
      setOpeningSupport(false);
    });
    Crisp.chat.onChatClosed(() => {
      Crisp.chat.hide();
    });
  }, []);

  const [unread, setUnread] = useState(false);
  useEffect(() => {
    if (Cookies.get("read-changelog-0725")) {
      setUnread(false);
    } else {
      setUnread(true);
    }
  }, []);

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
              href="https://dub.sh/changelog"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => Cookies.set("read-changelog-0725", true)}
              className="flex w-full justify-between rounded-md p-2 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200"
            >
              <IconMenu text="Changelog" icon={<Edit3 className="h-4 w-4" />} />
              {unread && <Badge text="1" variant="blue" />}
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
          {session && (
            <Image
              alt={session?.user?.email || "Avatar for logged in user"}
              src={
                session?.user?.image ||
                `https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`
              }
              width={40}
              height={40}
              className="h-9 w-9 rounded-full border border-gray-300 transition-all duration-75 group-focus:outline-none group-active:scale-95 sm:h-10 sm:w-10"
            />
          )}
          {unread && (
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-blue-500" />
          )}
        </button>
      </Popover>
    </div>
  );
}
