import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { useSession, signOut } from "next-auth/react";

export default function UserDropdown() {
  const { data: session } = useSession();
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="rounded-full overflow-hidden border border-gray-300 w-10 h-10 flex justify-center items-center active:scale-95 focus:outline-none transition-all duration-75">
          {session && (
            <img
              alt={session?.user?.email || "Avatar for logged in user"}
              src={`https://avatars.dicebear.com/api/micah/${session?.user?.email}.svg`}
            />
          )}
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 p-1 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <Menu.Item>
            <button
              className="text-gray-900 hover:bg-gray-100 group flex w-full items-center rounded-md px-2 py-2 text-sm"
              onClick={() => signOut()}
            >
              Logout
            </button>
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
