"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import LinkCard from "#/ui/home/link-card";
import PlaceholderCard from "#/ui/home/placeholder-card";
import { LoadingSpinner } from "#/ui/icons";
import { CornerDownLeft } from "lucide-react";
import { APP_DOMAIN, FRAMER_MOTION_LIST_ITEM_VARIANTS } from "#/lib/constants";
import useLocalStorage from "#/lib/hooks/use-local-storage";
import { SimpleLinkProps } from "#/lib/types";
import { toast } from "sonner";

export default function Demo() {
  const formRef = useRef<HTMLFormElement>(null);
  const [hashes, setHashes] = useLocalStorage<SimpleLinkProps[]>("hashes", []);
  const [submitting, setSubmitting] = useState(false);
  const [showDefaultLink, setShowDefaultLink] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);

  const parseUrl = useCallback((url: string) => {
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
    const regex = new RegExp(expression);
    const isValidUrl = url.match(regex);

    if (!~url.indexOf("http") && isValidUrl) {
      return "https://" + url;
    }
    
    return url;
  }, []);

  return (
    <div className="mx-auto mb-5 w-full max-w-xl px-2.5 sm:px-0">
      <form
        noValidate
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          fetch("/api/edge/links", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: parseUrl(e.currentTarget.url.value)
            }),
          }).then(async (res) => {
            setSubmitting(false);
            if (res.ok) {
              const data = await res.json();
              setHashes([
                ...hashes,
                {
                  key: data.key,
                  url: data.url,
                },
              ]);
              toast.success("Successfully shortened link!");
              formRef.current?.reset();
            } else {
              const error = await res.text();
              toast.error(error);
            }
          });
        }}
      >
        <div className="relative flex items-center">
          <input
            autoFocus
            ref={inputRef}
            name="url"
            type="url"
            placeholder="Example: https://mega-long-link.com/shorten-it"
            autoComplete="off"
            required
            className="peer block w-full rounded-lg border-gray-200 py-4 pl-5 pr-12 text-lg text-gray-900 placeholder-gray-400 shadow-lg focus:border-gray-500 focus:outline-none focus:ring-gray-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className={`${submitting
              ? "cursor-not-allowed bg-gray-100"
              : "hover:border-gray-700 hover:text-gray-700 peer-focus:text-gray-700"
              } absolute inset-y-0 right-0 my-1.5 mr-1.5 flex w-10 items-center justify-center rounded border border-gray-200 font-sans text-sm font-medium text-gray-400`}
          >
            {submitting ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <CornerDownLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      <motion.ul
        key={hashes.length + 1} // workaround for https://github.com/framer/motion/issues/776, add 1 to account for the demo GH link
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
        className="mt-3 grid gap-2"
      >
        {showDefaultLink && (
          <LinkCard
            key="chatgpt"
            _key="chatgpt"
            url="https://chat.openai.com"
            hashes={hashes}
            setHashes={setHashes}
            setShowDefaultLink={setShowDefaultLink}
          />
        )}
        {hashes.map(({ key, url }) => (
          <LinkCard
            key={key}
            _key={key}
            url={url}
            hashes={hashes}
            setHashes={setHashes}
          />
        ))}
        {Array.from({
          length: showDefaultLink ? 3 - hashes.length : 4 - hashes.length,
        }).map((_, i) => (
          <PlaceholderCard key={i} />
        ))}
        <motion.li
          variants={FRAMER_MOTION_LIST_ITEM_VARIANTS}
          className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-500 shadow-lg"
        >
          Note: Public links will be automatically-deleted after 30 minutes.{" "}
          <a
            href={`${APP_DOMAIN}/register`}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-gray-700 underline transition-all hover:text-black"
          >
            Create a free account
          </a>{" "}
          to keep your links forever.
        </motion.li>
      </motion.ul>
    </div>
  );
}
