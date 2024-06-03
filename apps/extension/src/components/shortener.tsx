import { Ban, CircleAlert,CornerDownLeftIcon, Link2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import IconMenu from "../../public/IconMenu";
import { ShortLinkProps, UserProps } from "../types";
import LinkCard from "./link";
import { cn, isValidUrl } from "@dub/utils";
import { useAddEditLinkModal } from "../../src/link/add-edit-link-modal";
import { useSelectedWorkspace } from "../../src/workspace/workspace-now";
import { setLocalLinks } from "../../utils/src/function/localLinks";
import { useAuth } from "../../src/auth/useAuth";
import { LinkPreviewPlaceholder } from "../../ui/s/src";
import LinkTemplate from "../../public/icons/linkTemplate";


const Shortener: React.FC = () => {
  const [url, setUrl] = useState("");
  const [link, setLink] = useState<ShortLinkProps>();
  const [isValid, setIsValid] = useState(true);
  const { selectedWorkspace} = useSelectedWorkspace();
  const { AddEditLinkModal, AddEditLinkButton } = useAddEditLinkModal();
  const { user } = useAuth();


  const fetchCurrentTabUrl = async () => {
    try {
      const currentURL = window.location.href;
      setUrl(currentURL);
    } catch (error) {
      console.error("Error fetching current tab URL:", error);
    }
  };

  useEffect(() => {
    fetchCurrentTabUrl();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    setIsValid(newUrl === "" || isValidUrl(newUrl));
    setUrl(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValidUrl(url)) {
      return;
    }
    try {
      const response = await fetch(`https://cors-anywhere.herokuapp.com/https://dub.co/api/links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url,
          domain: "dub.sh",
          publicStats: true,
        }),
      });

      if (response.ok) {
        setUrl("");
        const newLink: ShortLinkProps = await response.json();
        setLocalLinks({newLink});
        setLink(newLink);
      }
    } catch (error) {
      console.error("Error submitting link:", error);
    }
  };

  return (
    <div>
      <AddEditLinkModal />
      <form onSubmit={handleSubmit} className="relative mt-3 flex items-center justify-center">
        <IconMenu
          icon={
            <Link2 className={cn("absolute inset-y-0 left-0 my-2 ml-3 h-5 w-5 ",
            {
              "text-gray-400": isValid,
              "text-red-400": !isValid,
            },

            )} />
          }
        />
        <input
          type="text"
          placeholder="https://app.dub.co/register"
          autoComplete="off"
          required
          className={cn(
          
            {
              "border-gray-200 focus:border-black": isValid,
              "border-red-300 focus:border-red-400": !isValid,
            },
          "peer block w-full rounded-md border  overflow-hidden bg-white p-2 pl-10 pr-14 shadow-lg  focus:outline-nonefocus:border-black focus:outline-none focus:ring-0 sm:text-sm")}
          value={url}
          onChange={handleInputChange}
        />
        <button className={cn(
          {
             "border-gray-200 focus:border-black hover:border-gray-700" :isValid,
             "border-red-300 focus:border-red-400 hover:border-red-400": !isValid
          },
          "lucide lucide-corner-down-left absolute inset-y-0 right-0 my-1.5 mr-1.5 flex w-12 items-center justify-center rounded border  p-0.5 font-sans text-sm font-medium text-gray-400  hover:text-gray-700  focus:outline-none" )} type="submit">
          {isValid ? ((user && selectedWorkspace) ? (<AddEditLinkButton />) : <CornerDownLeftIcon className="h-5 w-5"/>) : <Ban className="h-5 w-5 text-red-400" />}
        </button>
      </form>
      {link ? <LinkCard link={link} /> : <LinkTemplate/>}
    </div>
  );
};

export default Shortener;
