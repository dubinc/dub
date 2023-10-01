"use client";

import Background from "#/ui/home/background";
import { InlineSnippet } from "@/components/app/domains/domain-configuration";
import { useParams } from "next/navigation";
import va from "@vercel/analytics";

export default function PlaceholderContent() {
  const { domain } = useParams() as { domain: string };
  return (
    <>
      <Background />
      <div
        className="z-10 mb-20"
      >
        <div
          className="mx-5 flex flex-col items-center space-y-10 text-center sm:mx-auto"
        >
          <h1
            className="font-display text-4xl font-bold text-gray-800 transition-colors sm:text-5xl"
          >
            Welcome to 7qr
          </h1>
          <p
            className="max-w-xl text-gray-600 transition-colors sm:text-lg"
          >
            <InlineSnippet>{domain}</InlineSnippet> is a custom domain on{" "}
            <a
              className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text font-semibold text-transparent decoration-rose-600 hover:underline"
              href="https://7qr.codes"
              onClick={() =>
                va.track("Referred from custom domain", {
                  domain,
                  medium: "text",
                })
              }
            >
              7qr
            </a>{" "}
            - a link management tool for modern marketing teams to create,
            share, and track short links.
          </p>
          <a
            href="https://7qr.codes"
            onClick={() =>
              va.track("Referred from custom domain", {
                domain,
                medium: "button",
              })
            }
            className="rounded-full bg-gray-800 px-10 py-2 font-medium text-white transition-colors hover:bg-black"
          >
            Create Your Free Branded Link
          </a>
        </div>
      </div>
    </>
  );
}
