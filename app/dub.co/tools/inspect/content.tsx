"use client";

import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "#/ui/icons";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Link2 } from "lucide-react";

export default function LinkInspectorContent() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  return (
    <>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          setRedirecting(true);
          router.push(e.currentTarget.url.value);
        }}
      >
        <div className="relative flex items-center">
          <Link2 className="absolute inset-y-0 left-0 my-2 ml-3 w-5 text-gray-400" />
          <input
            name="url"
            type="url"
            ref={inputRef}
            defaultValue="https://dub.sh/github+"
            // match pattern regex for making sure the url starts with https://dub.sh/, has the slug in the middle, and ends with a +
            pattern="https://dub\.sh/[A-Za-z0-9]+\+"
            placeholder="Enter a dub.sh link to inspect (insert a '+' at the end)"
            autoComplete="off"
            required
            className="peer block w-full rounded-md border border-gray-200 bg-white p-2 pl-10 pr-12 shadow-lg focus:border-black focus:outline-none focus:ring-0 sm:text-sm"
          />
          <button
            type="submit"
            disabled={redirecting}
            className={`${
              redirecting
                ? "cursor-not-allowed bg-gray-100"
                : "hover:border-gray-700 hover:text-gray-700 peer-focus:text-gray-700"
            } absolute inset-y-0 right-0 my-1.5 mr-1.5 flex w-10 items-center justify-center rounded border border-gray-200 font-sans text-sm font-medium text-gray-400`}
          >
            {redirecting ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <CornerDownLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </>
  );
}
