import React from "react";
import chromeWindowBg from "../public/chromeWindow.png";
import reactLogo from "../public/react.png";
import tailwindLogo from "../public/tailwind.png";
import tailwindBg from "../public/tailwind_bg.png";
import typescriptLogo from "../public/typescript.png";

export default function ContentApp() {
  const [isdialogOpen, setIsDialogOpen] = React.useState(true);

  if (!isdialogOpen) {
    return (
      <div className="mx-auto p-6">
        <button
          onClick={() => setIsDialogOpen(true)}
          className="rounded-md bg-white p-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          🧩 Open content script hint <span aria-hidden="true">+</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl md:px-0 lg:p-6">
      <div className="relative isolate overflow-hidden bg-gray-900 px-6 pt-16 shadow-2xl sm:h-[100vh] md:h-full md:pt-24 lg:flex lg:gap-x-20 lg:rounded-3xl lg:px-24 lg:pt-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden">
          <div className="flex w-[108rem] flex-none justify-end">
            <picture>
              <img
                src={tailwindBg}
                alt=""
                className="hidden w-[90rem] max-w-none flex-none dark:block"
                decoding="async"
              />
            </picture>
          </div>
        </div>
        <div className="mx-auto max-w-md text-center lg:mx-0 lg:flex-auto lg:py-12 lg:text-left">
          <div className="mx-auto my-4 flex items-center justify-center space-x-4">
            <img
              alt="React logo"
              src={reactLogo}
              className="relative inline-block w-12"
            />
            <div className="text-3xl text-white">+</div>
            <img
              alt="TypeScript logo"
              src={typescriptLogo}
              className="relative inline-block w-12"
            />
            <div className="text-3xl text-white">+</div>
            <img
              alt="Tailwind logo"
              src={tailwindLogo}
              className="relative inline-block w-12"
            />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            This is a CHROME EXTENSION running React, TypeScript, and
            Tailwind.css.
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            Learn more about creating cross-browser extensions by{" "}
            <button
              onClick={() => setIsDialogOpen(false)}
              className="underline hover:no-underline
            "
            >
              closing this hint
            </button>
            .
          </p>
        </div>
        <div className="relative mt-16 h-80 lg:mt-8">
          <img
            className="absolute left-0 top-0 w-[57rem] max-w-none rounded-md bg-white/5 ring-1 ring-white/10"
            src={chromeWindowBg}
            alt="Chrome window screenshot"
            width="1824"
            height="1080"
          />
        </div>
      </div>
    </div>
  );
}
