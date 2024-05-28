import { Link2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SendIcon } from "../../public";
import IconMenu from "../../public/IconMenu";
import Link from "./link";
import { LinkProp, LinkProps, ShortLinkProps, UserProps } from "../types";

const dummyData: ShortLinkProps & { user: UserProps } = {
  id: "123456",
  key: "abcdef",
  domain: "example.com",
  url: "https://example.com",
  rewrite: true,
  password: "password123",
  expiresAt: new Date("2025-12-31"),
  createdAt: new Date(),
  lastClicked: new Date(),
  archived: false,
  tags: [
    { id: "tag1", name: "marketing", color: "red" },
    { id: "tag2", name: "social", color: "blue" },
  ],
  comments: "This is a sample comment.",
  user: {
    id: "user123",
    name: "John Doe",
    email: "john.doe@example.com",
    image: "https://example.com/johndoe.jpg",
    createdAt: new Date("2023-01-01"),
    source: "google",
    migratedWorkspace: "workspace123",
  },
  expiredUrl: null,
  externalId: null,
  proxy: false,
  title: "Sample Title",
  description: "Sample Description",
  image: "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://dub.co&size=64",
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  ios: null,
  android: null,
  geo: null,
  userId: "user123",
  projectId: "project123",
  publicStats: true,
  clicks: 24,
  updatedAt: new Date(),
  shortLink: "https://dub.sh/hstEJj7",
  tagId: null,
  qrCode: "https://api.dub.co/qr?url=https://dub.sh/hstEJj7?qr=1",
  workspaceId: "ws_null"
};

const Shortener: React.FC = () => {
  const [url, setUrl] = useState("");
  const [link, setLink] = useState<ShortLinkProps>(dummyData);

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
    setUrl(e.target.value);
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
        const newLink: ShortLinkProps = await response.json();
        setLink(newLink);
        setUrl("");
      }
    } catch (error) {
      console.error("Error submitting link:", error);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="relative mt-3 flex items-center">
        <IconMenu
          icon={
            <Link2 className="absolute inset-y-0 left-0 my-2 ml-3 h-5 w-5 text-gray-400" />
          }
        />
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
