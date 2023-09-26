"use client";

import Link from "next/link";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/ui/accordion";
import { AnimatePresence, motion } from "framer-motion";
import { FEATURES_LIST } from "#/lib/constants/content";
import BlurImage from "../blur-image";
import { cn } from "#/lib/utils";
import PlayButton from "#/ui/home/play-button";
import { Play } from "lucide-react";

export default function Features() {
  const [activeFeature, setActiveFeature] = useState(0);
  return (
    <div id="features">
      <MaxWidthWrapper className="pb-10 pt-24">
        <div className="mx-auto max-w-md text-center sm:max-w-xl">
          <h2 className="font-display text-4xl font-extrabold leading-tight text-black sm:text-5xl sm:leading-tight">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Powerful
            </span>{" "}
            features for{" "}
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              modern
            </span>{" "}
            marketing teams
          </h2>
          <p className="mt-5 text-gray-600 sm:text-lg">
            Dub is more than just a link shortener. We've built a suite of
            powerful features that gives you marketing superpowers.
          </p>
        </div>

        <div className="my-10 w-full overflow-hidden rounded-xl border border-gray-200 bg-white/10 shadow-[inset_10px_-50px_94px_0_rgb(199,199,199,0.2)] backdrop-blur lg:h-[540px]">
          <div className="grid grid-cols-1 gap-10 p-5 lg:grid-cols-3">
            <Accordion
              type="single"
              defaultValue="analytics"
              onValueChange={(e) => {
                setActiveFeature(
                  FEATURES_LIST.findIndex(({ slug }) => slug === e),
                );
              }}
            >
              {FEATURES_LIST.map((feature) => (
                <AccordionItem key={feature.slug} value={feature.slug}>
                  <AccordionTrigger>
                    <div className="flex items-center space-x-3 p-3">
                      <feature.icon className="h-5 w-5 text-gray-500" />
                      <h3 className="text-base font-semibold text-gray-600">
                        {feature.accordionTitle}
                      </h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-3">
                      <p className="mb-4 text-sm text-gray-500">
                        {feature.description}
                      </p>
                      <Link
                        href={`/features/${feature.slug}`}
                        className="block max-w-fit rounded-full border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black"
                      >
                        Learn more
                      </Link>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {FEATURES_LIST.map((feature, index) => {
                  if (index === activeFeature) {
                    return (
                      <motion.div
                        key={feature.slug}
                        initial={{
                          y: 10,
                          opacity: 0,
                        }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{
                          y: -10,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.15,
                          stiffness: 300,
                          damping: 30,
                        }}
                        className="relative -mb-6 aspect-[1735/990] w-full overflow-hidden rounded-t-2xl shadow-2xl lg:mt-10 lg:h-[500px] lg:w-[800px]"
                      >
                        <PlayButton
                          url={feature.videoUrl}
                          className="group absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-black bg-opacity-0 transition-all duration-300 hover:bg-opacity-5 focus:outline-none"
                        >
                          <div className="flex flex-col items-center space-y-4">
                            <div className="rounded-full bg-gradient-to-tr from-black to-gray-700 p-5 ring-[6px] ring-gray-300 transition-all duration-300 group-hover:scale-110 group-hover:ring-4 group-active:scale-90">
                              <Play
                                className="h-5 w-5 text-white"
                                fill="currentColor"
                              />
                            </div>
                            <div className="flex rounded-full border border-gray-200 bg-white p-2 shadow-xl group-hover:shadow-2xl">
                              <BlurImage
                                src="https://d2vwwcvoksz7ty.cloudfront.net/author/steventey.jpg"
                                alt="Steven Tey"
                                width={36}
                                height={36}
                                className="h-10 w-10 rounded-full"
                              />
                              <div className="ml-2 mr-4 flex flex-col text-left">
                                <p className="text-sm font-medium text-gray-500">
                                  Watch Demo
                                </p>
                                <p className="text-sm text-blue-500">
                                  {feature?.videoLength || "2:30"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </PlayButton>
                        <BlurImage
                          src={feature.thumbnail}
                          placeholder="blur"
                          blurDataURL={feature.thumbnailBlurhash}
                          alt={feature.title}
                          className={cn(
                            "absolute h-full object-cover",
                            feature.slug === "branded-links" &&
                              "object-left-top",
                          )}
                          width={1735}
                          height={990}
                        />
                      </motion.div>
                    );
                  }
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
