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
          <div className="p-1 w-full sm:w-56 rounded-md bg-white">
            <button
              className="relative p-2 rounded-md w-full hover:bg-gray-100 transition-all duration-75 text-sm text-left"
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
        <div className="rounded-full overflow-hidden border border-gray-300 w-10 h-10 flex justify-center items-center active:scale-95 focus:outline-none transition-all duration-75">
          {session && (
            <img
              alt={session?.user?.email || "Avatar for logged in user"}
              src={`https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`}
            />
          )}
        </div>
      </Popover>
    </div>
  );
}
