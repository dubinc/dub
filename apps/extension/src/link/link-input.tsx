import { cn, isValidUrl } from "@dub/utils";
import { Ban, CornerDownLeftIcon, Link2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import LinkTemplate from "../../public/icons/linkTemplate";
import Input from "../../ui/input";
import { useAddEditLinkModal } from "../../ui/modal/add-edit-link-modal";
import { setLocalLinks } from "../../utils/functions/localLinks";
import { useAuth } from "../auth/use-Auth";
import { ShortLinkProps } from "../types";
import { useSelectedWorkspace } from "../workspace/workspace-now";
import LinkCard from "./link-card";
import AllLinks from "./all-links";

export default function LinkInput() {
  const [url, setUrl] = useState("");
  const [link, setLink] = useState<ShortLinkProps>();
  const [isValid, setIsValid] = useState(true);
  const { selectedWorkspace } = useSelectedWorkspace();
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
      const response = await fetch(
        `https://cors-anywhere.herokuapp.com/https://dub.co/api/links`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: url,
            domain: "dub.sh",
            publicStats: true,
          }),
        },
      );

      if (response.ok) {
        setUrl("");
        const newLink: ShortLinkProps = await response.json();
        setLocalLinks({ newLink });
        setLink(newLink);
      }
    } catch (error) {
      console.error("Error submitting link:", error);
    }
  };

  return (
    <div>
      <AddEditLinkModal />
      <form
        onSubmit={handleSubmit}
        className="relative flex mb-4 items-center justify-center"
      >
        <Link2
          className={cn("absolute inset-y-0 left-0 my-2 ml-4 h-5 w-5 ", {
            "text-gray-400": isValid,
            "text-red-900": !isValid,
          })}
        />

        <Input
          type="text"
          placeholder="https://app.dub.co/register"
          autoComplete="off"
          required
          className={cn(
            {
              "border-gray-200 focus:border-black": isValid,
              "border-red-900 focus:border-red-900": !isValid,
            },
            "h-auto w-full px-12",
          )}
          value={url}
          onChange={handleInputChange}
        />
        <div
          className={cn(
            {
              "border-gray-200 hover:border-gray-700 focus:border-black":
                isValid,
              "border-red-300 hover:border-red-900 focus:border-red-900":
                !isValid,
            },
            "lucide lucide-corner-down-left absolute inset-y-0 right-0 my-1.5 mr-1.5 flex w-12 items-center justify-center rounded border  p-0.5 font-sans text-sm font-medium text-gray-400  hover:text-gray-700  focus:outline-none",
          )}
        >
          {isValid ? (
            user && selectedWorkspace ? (
              <AddEditLinkButton />
            ) : (
              <CornerDownLeftIcon className="h-5 w-5" />
            )
          ) : (
            <Ban className="h-5 w-5 border-red-900 text-red-900" />
          )}
        </div>
      </form>
      <div className="w-[400px] flex">
       {link ? <LinkCard props={link} /> : <AllLinks />}
      </div>
    </div>
  );
}
