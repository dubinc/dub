"use client";

import { Link2 } from "lucide-react";
import { useCallback } from "react";

export default function LinkInspectorForm() {
  const checkURL = useCallback((e) => {
    var string = e.target.value;
    if (!~string.indexOf("http")) {
      string = "https://" + string;
    }
    e.target.value = string;
    return e;
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        window.open(`${e.currentTarget.url.value}+`, "_blank");
      }}
    >
      <div className="relative flex items-center">
        <Link2 className="absolute inset-y-0 left-0 my-2 ml-3 w-5 text-gray-400" />
        <input
          name="url"
          type="url"
          onBlur={checkURL}
          placeholder="https://7qr.sh/github"
          autoComplete="off"
          required
          className="peer block w-full rounded-md border-gray-300 pl-10 pr-12 text-sm text-gray-900 placeholder-gray-300 focus:border-gray-500 focus:outline-none focus:ring-gray-500"
        />
        <button className="absolute inset-y-0 right-0 my-1.5 mr-1.5 flex w-10 items-center justify-center rounded border border-gray-200 font-sans text-sm font-medium text-gray-400 hover:border-gray-700 hover:text-gray-700 peer-focus:text-gray-700">
          ↗
        </button>
      </div>
    </form>
  );
}
