import { useState } from "react";
import { CreateIcon, HistoryIcon, SettingIcon, TitleIcon } from "../public";
import AllLinks from "./components/allLinks";
import Shortener from "./components/shortener";
import { LinkProps } from "./components/types";

interface ExtensionProps {
  handleClose: () => void;
}

const Extension: React.FC<ExtensionProps> = ({ handleClose }) => {
  const [openTab, setOpenTab] = useState<string>("create");
  const [allLinks, setAllLinks] = useState<LinkProps[]>([]);

  const handleAllFetchUrl = () => {
    console.log("get");
    setAllLinks([]);
  };

  return (
    <div className="w-100 mb-10 mr-10 rounded-lg bg-white  p-6 shadow-lg">
      <div className="flex flex-row justify-between">
        <TitleIcon />
        <p
          onClick={handleClose}
          className="cursor-pointer text-sm text-gray-800 hover:text-blue-900"
        >
          close
        </p>
      </div>

      <div className="mt-3 flex gap-4">
        <button
          className="group rounded-full bg-gray-200 p-3 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95"
          onClick={() => {
            setOpenTab("history");
            handleAllFetchUrl();
          }}
        >
          <HistoryIcon />
        </button>
        <button
          className="group rounded-full bg-gray-200 p-3 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95"
          onClick={() => setOpenTab("create")}
        >
          <CreateIcon />
        </button>
      </div>
      {openTab === "create" && <Shortener />}
      {openTab === "history" && <AllLinks links={allLinks} />}

      <div className="flex justify-between">
        <a
          href="https://app.dub.co/"
          className="block px-1 py-1 font-bold text-black"
        >
          Login
        </a>
        <button className="group flex justify-center rounded-full bg-gray-100 p-2 transition-all duration-75 hover:scale-105 hover:bg-blue-100 focus:outline-none active:scale-95">
          <SettingIcon />
        </button>
      </div>
    </div>
  );
};

export default Extension;
