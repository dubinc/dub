import { GalleryVerticalEnd, Link, Settings, X } from "lucide-react";
import { useState } from "react";
import { TitleIcon } from "../public";
import IconMenu from "../public/IconMenu";
import { TooltipProvider } from "../ui";
import AllLinks from "./link/all-links";
import LinkInput from "./link/link-input";
import UserSpace from "./usespace/userspace";
import { SelectedWorkspaceProvider } from "./workspace/workspace-now";

function Extension({ handleClose }: { handleClose: () => void }) {
  const [openTab, setOpenTab] = useState<boolean>(true);

  return (
    <div className="mb-14 mr-10 rounded-lg bg-white p-6 text-black shadow-lg">
      <TooltipProvider>
        <SelectedWorkspaceProvider>
          <div className="flex flex-row justify-between">
            <TitleIcon />
            <div
              onClick={handleClose}
              className="cursor-pointer rounded-full p-1 text-sm text-gray-500 transition-all duration-75 hover:bg-gray-100  hover:text-black focus:outline-none active:bg-gray-200 "
            >
              <IconMenu icon={<X className="h-5 w-5" />} />
            </div>
          </div>

          <div className="mt-3 flex gap-4">
            <div
              className={`${
                openTab ? "bg-blue-100 text-black" : "bg-gray-200 text-gray-500"
              } group cursor-pointer rounded-full p-4 transition-all duration-75 hover:scale-105 hover:text-black focus:outline-none active:scale-95`}
              onClick={() => setOpenTab(true)}
            >
              <IconMenu icon={<Link className="h-4 w-4" />} />
            </div>
            <div
              className={`${
                !openTab
                  ? "bg-blue-100 text-black"
                  : "bg-gray-200 text-gray-500"
              }
              group cursor-pointer rounded-full p-4 transition-all duration-75 hover:scale-110 hover:text-black focus:outline-none active:scale-95`}
              onClick={() => {
                setOpenTab(false);
              }}
            >
              <IconMenu icon={<GalleryVerticalEnd className="h-4 w-4 " />} />
            </div>
          </div>
          <div className="h-40 overflow-y-auto my-4"  style={{ scrollbarWidth: "none", whiteSpace: "nowrap" }}>
          {openTab && <LinkInput />}
          {!openTab && <AllLinks />}
          </div>
          <div className="flex items-center justify-between">
            <UserSpace />
            <a
              href="https://app.dub.co/"
              className="group flex justify-center rounded-full bg-gray-100 p-2 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95"
            >
              <IconMenu
                icon={
                  <Settings className="h-4 w-4 text-gray-500 hover:text-black" />
                }
              />
            </a>
          </div>
        </SelectedWorkspaceProvider>
      </TooltipProvider>
    </div>
  );
}

export default Extension;
