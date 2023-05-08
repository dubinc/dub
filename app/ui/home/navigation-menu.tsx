"use client";

import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";
import clsx from "clsx";
import Link from "next/link";
import React from "react";

const comparisons = [
  {
    title: "Bitly",
    slug: "bitly",
  },
  {
    title: "Rebrandly",
    slug: "rebrandly",
  },
  {
    title: "Short.io",
    slug: "short-io",
  },
  {
    title: "Cuttly",
    slug: "cuttly",
  },
];

export default function NavigationMenu() {
  return (
    <NavigationMenuPrimitive.Root>
      <NavigationMenuPrimitive.List className="flex flex-row space-x-2 p-2">
        {/* <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger
            className={clsx(
              "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-900",
              "text-sm font-medium",
              "text-gray-700 dark:text-gray-100",
              "focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75",
            )}
          >
            <p>Features</p>
            <ChevronDown className="h-4 w-4 transition-all group-radix-state-open:rotate-180" />
          </NavigationMenuPrimitive.Trigger>

          <NavigationMenuPrimitive.Content
            className={clsx(
              "absolute top-0 left-0 w-auto rounded-lg",
              "radix-motion-from-start:animate-enter-from-left",
              "radix-motion-from-end:animate-enter-from-right",
              "radix-motion-to-start:animate-exit-to-left",
              "radix-motion-to-end:animate-exit-to-right",
            )}
          >
            <div className="w-[21rem] p-3 lg:w-[23rem]">
              <div className="grid grid-cols-6 gap-4">
                <div className="col-span-2 w-full rounded-md bg-gray-100 p-4 dark:bg-gray-900"></div>

                <div className="col-span-4 flex w-full flex-col space-y-3 rounded-md bg-gray-100 p-4 dark:bg-gray-900">
                  <div className="h-12 w-full rounded-md bg-white dark:bg-gray-700"></div>
                  <div className="h-12 w-full rounded-md bg-white dark:bg-gray-700"></div>
                  <div className="h-12 w-full rounded-md bg-white dark:bg-gray-700"></div>
                  <div className="h-12 w-full rounded-md bg-white dark:bg-gray-700"></div>
                </div>
              </div>
            </div>
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>

        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger
            className={clsx(
              "group flex items-center space-x-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-900",
              "text-sm font-medium text-gray-700 dark:text-gray-100",
              "focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75",
            )}
          >
            <p>Comparisons</p>
            <ChevronDown className="h-4 w-4 transition-all group-radix-state-open:rotate-180" />
          </NavigationMenuPrimitive.Trigger>

          <NavigationMenuPrimitive.Content
            className={clsx(
              "absolute top-0 left-0 w-auto rounded-lg",
              "radix-motion-from-start:animate-enter-from-left",
              "radix-motion-from-end:animate-enter-from-right",
              "radix-motion-to-start:animate-exit-to-left",
              "radix-motion-to-end:animate-exit-to-right",
            )}
          >
            <div className="w-[16rem] p-3 lg:w-[18rem]">
              <div className="grid w-full gap-2">
                {comparisons.map(({ title, slug }) => (
                  <Link
                    key={slug}
                    className={clsx(
                      "w-full rounded-md px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-900",
                      "focus:outline-none focus-visible:ring focus-visible:ring-purple-500 focus-visible:ring-opacity-75",
                    )}
                    href={`/vs/${slug}`}
                  >
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {title}
                    </span>

                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Lorem ipsum dolor sit amet.
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item> */}

        {/* <NavigationMenuPrimitive.Item asChild>
          <Link
            href="/pricing"
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black"
          >
            Pricing
          </Link>
        </NavigationMenuPrimitive.Item> */}

        {/* <NavigationMenuPrimitive.Item asChild>
          <Link
            href="/blog"
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black"
          >
            Blog
          </Link>
        </NavigationMenuPrimitive.Item> */}

        <NavigationMenuPrimitive.Item asChild>
          <Link
            href="/changelog"
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-500 transition-colors ease-out hover:text-black"
          >
            Changelog
          </Link>
        </NavigationMenuPrimitive.Item>

        <NavigationMenuPrimitive.Indicator
          className={clsx(
            "z-10",
            "top-[100%] flex h-2 items-end justify-center overflow-hidden",
            "radix-state-visible:animate-fade-in",
            "radix-state-hidden:animate-fade-out",
            "transition-[width_transform] duration-[250ms] ease-[ease]",
          )}
        >
          <div className="relative top-1 h-2 w-2 rotate-45 bg-white dark:bg-gray-800" />
        </NavigationMenuPrimitive.Indicator>
      </NavigationMenuPrimitive.List>

      <div
        className={clsx(
          "absolute flex justify-center",
          "left-[-30%] top-[100%] w-[140%]",
        )}
        style={{
          perspective: "2000px",
        }}
      >
        <NavigationMenuPrimitive.Viewport
          className={clsx(
            "relative mt-2 overflow-hidden rounded-md bg-white shadow-lg dark:bg-gray-800",
            "w-radix-navigation-menu-viewport",
            "h-radix-navigation-menu-viewport",
            "radix-state-open:animate-scale-in-content",
            "radix-state-closed:animate-scale-out-content",
            "origin-[top_center] transition-[width_height] duration-300 ease-[ease]",
          )}
        />
      </div>
    </NavigationMenuPrimitive.Root>
  );
}
