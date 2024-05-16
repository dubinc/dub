import React, { useEffect, useState } from "react";
import { LinkIcon, SendIcon } from "../../public";
import Link from "./link";
import { LinkProps } from "./types";

const Shortener: React.FC = () => {
  const [url, setUrl] = useState("");
  const [link, setLink] = useState<LinkProps | null>(null);

  useEffect(() => {}, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
  };

  const fetchCurrentTabUrl = async () => {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTabUrl = tabs[0]?.url;
      if (currentTabUrl) {
        setUrl(currentTabUrl);
      }
    } catch (error) {
      console.error("Error fetching current tab URL:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/links", {
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
        const newLink = await response.json();
        setLink({
          key: newLink.key,
          url: newLink.url,
          shortLink: newLink.shortLink,
          createdAt: newLink.createdAt,
          clicks: newLink.clicks,
          qrCode: newLink.qrCode,
        });
        setUrl("");
      }
    } catch (error) {
      console.error("Error submitting link:", error);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="relative mt-3 flex items-center">
        <LinkIcon />
        <input
          type="text"
          placeholder="Enter URL..."
          autoComplete="off"
          required
          className="peer block w-full rounded-md border border-gray-200 bg-white p-2 pl-10 pr-12 shadow-lg focus:border-black focus:outline-none focus:ring-0 sm:text-sm"
          value={url}
          onChange={handleInputChange}
        />
        <button type="submit">
          <SendIcon />
        </button>
      </form>
      <Link link={link} />
    </>
  );
};

export default Shortener;
