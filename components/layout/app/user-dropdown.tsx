import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Popover from "@/components/shared/popover";

export default function UserDropdown() {
  const { data: session } = useSession();
  const [openPopover, setOpenPopover] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <Popover
        content={
          <div className="w-full rounded-md bg-white p-1 sm:w-56">
            <button
              className="relative w-full rounded-md p-2 text-left text-sm transition-all duration-75 hover:bg-gray-100"
              onClick={() => signOut()}
            >
              Logout
            </button>
          </div>
        }
        align="end"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-300 transition-all duration-75 focus:outline-none active:scale-95"
        >
          {session && (
            <img
              alt={session?.user?.email || "Avatar for logged in user"}
              src={`https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`}
            />
          )}
        </button>
      </Popover>
    </div>
  );
}
