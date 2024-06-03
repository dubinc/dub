import { GalleryVerticalEnd, Link, Settings, X } from "lucide-react";
import { useState } from "react";
import { TitleIcon } from "../public";
import IconMenu from "../public/IconMenu";
import AllLinks from "./components/allLinks";
import Shortener from "./components/shortener";
import { ShortLinkProps } from "./types";
import UserSpace from "./workspace/workspace";
import { SelectedWorkspaceProvider } from "./workspace/workspace-now";
import { TooltipProvider } from "../ui/s/src";

interface ExtensionProps {
  handleClose: () => void;
}

const Extension: React.FC<ExtensionProps> = ({ handleClose }) => {
  const [openTab, setOpenTab] = useState<boolean>(true);

  return (
    <div className="mb-20 mr-10 rounded-lg bg-white text-black p-6 shadow-lg">
            <TooltipProvider >

      <SelectedWorkspaceProvider>
      <div className="flex flex-row justify-between">
        <TitleIcon />
        <div
          onClick={handleClose}
          className="cursor-pointer text-sm p-1 rounded-full text-gray-500 transition-all duration-75 hover:bg-gray-100  hover:text-black focus:outline-none active:bg-gray-200 "
        >
          <IconMenu icon={<X  className="w-5 h-5"/>} />
        </div>
      </div>

      <div className="mt-3 flex gap-4">
        <button
          className={`${
            openTab ? "bg-blue-100 text-black" : "bg-gray-200 text-gray-500"
          } group rounded-full p-3 transition-all duration-75 hover:text-black hover:scale-105 focus:outline-none active:scale-95`}
          onClick={() => setOpenTab(true)}
        >
          <IconMenu
            icon={<Link className="h-4 w-4" />}
          />
        </button>
        <button
          className={`${
            !openTab  ? "bg-blue-100 text-black" : "bg-gray-200 text-gray-500"
          }
          group rounded-full p-3 transition-all duration-75 hover:text-black hover:scale-110 focus:outline-none active:scale-95`}
          onClick={() => {
            setOpenTab(false);
          }}
        >
          <IconMenu
            icon={
              <GalleryVerticalEnd className="h-4 w-4 " />
            }
          />
        </button>
      </div>
      {openTab  && <Shortener />}
      {!openTab && <AllLinks />}

      <div className="flex items-center justify-between">
        <UserSpace />
        <a
        href="https://app.dub.co/"
         className="group flex justify-center rounded-full bg-gray-100 p-2 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95">
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
};

export default Extension;
